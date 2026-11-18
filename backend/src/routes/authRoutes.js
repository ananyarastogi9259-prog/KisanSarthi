// ============================================================
// src/routes/authRoutes.js
// Authentication & Instant Access Routes for KisanSarthi
// ============================================================
// Provides endpoints to register and auto-confirm farmer accounts
// without getting trapped by Supabase email verification limits.
// ============================================================

import express from 'express'
import { getServiceClient } from '../config/supabase.js'

const router = express.Router()

/**
 * POST /api/auth/register
 * Registers a new farmer account and automatically marks the email
 * as confirmed so the user can immediately log in.
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters.',
      })
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required.',
      })
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()
    const serviceClient = getServiceClient()

    // 1. Try to create the user with email_confirm: true
    let userId = null
    const { data: createData, error: createError } = await serviceClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
      },
    })

    if (createError) {
      let friendlyMessage = createError.message || 'Failed to register account.'
      if (
        friendlyMessage.includes('abcdefghijklmnopqrstuvwxyz') ||
        friendlyMessage.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ') ||
        friendlyMessage.toLowerCase().includes('at least one character of each') ||
        friendlyMessage.toLowerCase().includes('password should contain')
      ) {
        friendlyMessage = 'Password must include: at least 6 characters, one letter (a-z), and one number (0-9).'
      }

      const msg = (createError.message || '').toLowerCase()
      // If user already exists, update their password & confirm their email
      if (
        msg.includes('already registered') ||
        msg.includes('user already exists') ||
        createError.status === 422
      ) {
        const { data: listData } = await serviceClient.auth.admin.listUsers()
        const existing = listData?.users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        )

        if (existing) {
          userId = existing.id
          await serviceClient.auth.admin.updateUserById(existing.id, {
            password,
            email_confirm: true,
            user_metadata: {
              full_name: cleanName,
            },
          })
        } else {
          return res.status(400).json({
            success: false,
            message: friendlyMessage,
          })
        }
      } else {
        return res.status(400).json({
          success: false,
          message: friendlyMessage,
        })
      }
    } else {
      userId = createData?.user?.id
    }

    if (!userId) {
      return res.status(500).json({
        success: false,
        message: 'Could not determine user identifier.',
      })
    }

    // 2. Ensure profile record exists in `profiles`
    try {
      await serviceClient.from('profiles').upsert(
        {
          id: userId,
          full_name: cleanName,
          role: 'farmer',
        },
        { onConflict: 'id' }
      )
    } catch (e) {
      console.warn('Profile upsert notice:', e.message)
    }

    // 3. Ensure base farmer_profiles record exists
    try {
      await serviceClient.from('farmer_profiles').upsert(
        {
          id: userId,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )
    } catch (e) {
      console.warn('Farmer profile upsert notice:', e.message)
    }

    return res.status(201).json({
      success: true,
      message: 'Farmer account registered and confirmed successfully.',
      data: {
        userId,
        email: cleanEmail,
      },
    })
  } catch (err) {
    console.error('Registration handler error:', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error during registration.',
    })
  }
})

/**
 * POST /api/auth/confirm
 * Auto-confirms an existing user by email if they got stuck unconfirmed.
 */
router.post('/confirm', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' })
    }

    const cleanEmail = email.trim().toLowerCase()
    const serviceClient = getServiceClient()
    const { data: listData } = await serviceClient.auth.admin.listUsers()
    const user = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    await serviceClient.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    })

    return res.status(200).json({
      success: true,
      message: 'Account confirmed successfully.',
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to confirm account.',
    })
  }
})

export default router
