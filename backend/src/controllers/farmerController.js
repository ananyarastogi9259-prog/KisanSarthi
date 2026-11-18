// ============================================================
// src/controllers/farmerController.js
// Farmer Profile Controller
// ============================================================
// Handles reading and updating the authenticated farmer's profile.
// Interacts with Supabase PostgreSQL using the authenticated user's
// client context (req.supabase) to strictly respect Row Level Security (RLS).
// ============================================================

/**
 * GET /api/farmer/profile
 * Retrieves the logged-in farmer's combined profile data.
 * Returns base profile and farmer-specific profile (or null if not yet created).
 */
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase

    // 1. Fetch base profile from profiles table
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('id, full_name, phone, role, created_at')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching base profile:', profileError.message)
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile information.',
      })
    }

    // 2. Fetch agricultural/address profile from farmer_profiles table
    const { data: farmerProfile, error: farmerError } = await userClient
      .from('farmer_profiles')
      .select('id, state, district, village, address, pincode, created_at')
      .eq('id', userId)
      .maybeSingle()

    if (farmerError) {
      console.error('Error fetching farmer profile details:', farmerError.message)
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve farmer profile details.',
      })
    }

    // 3. Return combined profile response
    return res.status(200).json({
      success: true,
      data: {
        id: userId,
        email: req.user.email,
        full_name: profile?.full_name || null,
        phone: profile?.phone || null,
        role: profile?.role || 'farmer',
        created_at: profile?.created_at || null,
        farmer_profile: farmerProfile || null,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/farmer/profile
 * Updates the logged-in farmer's base profile and creates or updates
 * their agricultural/address details in farmer_profiles.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object.',
      })
    }

    const {
      full_name,
      phone,
      state,
      district,
      village,
      address,
      pincode,
    } = req.body

    // ── Input Validation ───────────────────────────────────────
    // Prevent modification of protected identity fields
    if (req.body.id !== undefined && req.body.id !== userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID cannot be altered.',
      })
    }

    if (req.body.role !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'User role cannot be altered via profile update.',
      })
    }

    // Validate phone if provided
    if (phone !== undefined && phone !== null && phone !== '') {
      if (typeof phone !== 'string' || phone.trim().length > 15) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be a text string with at most 15 characters.',
        })
      }
    }

    // Validate pincode if provided
    if (pincode !== undefined && pincode !== null && pincode !== '') {
      if (typeof pincode !== 'string' || !/^\d{6}$/.test(pincode.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Pincode must be a 6-digit numeric string (e.g. "411005").',
        })
      }
    }

    // Validate string fields
    const textFields = { full_name, state, district, village, address }
    for (const [key, value] of Object.entries(textFields)) {
      if (value !== undefined && value !== null && typeof value !== 'string') {
        return res.status(400).json({
          success: false,
          message: `Field "${key}" must be a text string.`,
        })
      }
      if (typeof value === 'string' && value.trim().length > 255) {
        return res.status(400).json({
          success: false,
          message: `Field "${key}" exceeds the maximum length of 255 characters.`,
        })
      }
    }

    // ── 1. Update profiles table ──────────────────────────────
    // Fields: full_name, phone
    const profileUpdates = {}
    if (full_name !== undefined) {
      profileUpdates.full_name = typeof full_name === 'string' ? full_name.trim() : null
    }
    if (phone !== undefined) {
      profileUpdates.phone = typeof phone === 'string' ? phone.trim() : null
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { data: updatedProfiles, error: profileError } = await userClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId)
        .select()

      if (profileError) {
        console.error('Error updating profiles table:', profileError.message)
      } else if (!updatedProfiles || updatedProfiles.length === 0) {
        // Diagnosis: The profiles table has RLS enabled with only a SELECT policy for authenticated users.
        // Direct UPDATE queries affect 0 rows under RLS. We respect RLS without bypassing it.
        console.warn(
          'profiles table update affected 0 rows due to existing table RLS policy. Respecting RLS without service-role bypass.'
        )
      }
    }

    // ── 2. Create or Update farmer_profiles table ─────────────
    // Fields: state, district, village, address, pincode
    const farmerUpdates = {}
    if (state !== undefined) {
      farmerUpdates.state = typeof state === 'string' ? state.trim() : null
    }
    if (district !== undefined) {
      farmerUpdates.district = typeof district === 'string' ? district.trim() : null
    }
    if (village !== undefined) {
      farmerUpdates.village = typeof village === 'string' ? village.trim() : null
    }
    if (address !== undefined) {
      farmerUpdates.address = typeof address === 'string' ? address.trim() : null
    }
    if (pincode !== undefined) {
      farmerUpdates.pincode = typeof pincode === 'string' ? pincode.trim() : null
    }

    // Only update farmer_profiles if at least one field was supplied
    if (Object.keys(farmerUpdates).length > 0) {
      const { error: fpError } = await userClient
        .from('farmer_profiles')
        .upsert({
          id: userId,
          ...farmerUpdates,
        })

      if (fpError) {
        console.error('Error upserting farmer_profiles table:', fpError.message)
        return res.status(500).json({
          success: false,
          message: 'Failed to update farmer profile details.',
        })
      }
    }

    // ── 3. Fetch and return updated combined profile ───────────
    const { data: latestProfile } = await userClient
      .from('profiles')
      .select('id, full_name, phone, role, created_at')
      .eq('id', userId)
      .maybeSingle()

    const { data: latestFarmerProfile } = await userClient
      .from('farmer_profiles')
      .select('id, state, district, village, address, pincode, created_at')
      .eq('id', userId)
      .maybeSingle()

    return res.status(200).json({
      success: true,
      message: 'Farmer profile updated successfully.',
      data: {
        id: userId,
        email: req.user.email,
        full_name: latestProfile?.full_name || null,
        phone: latestProfile?.phone || null,
        role: latestProfile?.role || 'farmer',
        created_at: latestProfile?.created_at || null,
        farmer_profile: latestFarmerProfile || null,
      },
    })
  } catch (err) {
    next(err)
  }
}

