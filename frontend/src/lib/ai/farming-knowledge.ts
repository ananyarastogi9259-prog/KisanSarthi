/**
 * KisanSarthi Offline Farming Knowledge Base
 * Provides comprehensive agricultural advisory in English and Hindi when no external AI API key is configured.
 */

interface KnowledgeEntry {
  patterns: RegExp[];
  en: string;
  hi: string;
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    patterns: [
      /soil\s*(fertility|health|quality|enrichment)/i,
      /improve\s*(the\s*)?soil/i,
      /mitti\s*(ki|ko)\s*(urvarak|shakti|upjao|sudhar)/i,
      /miti\s*k(i|o)/i,
      /मिट्टी.*(उर्वरक|उपजाऊ|सुधार|ताकत)/i,
      /उर्वरक\s*शक्ति/i,
    ],
    en: `To improve and sustain soil fertility, follow these proven practices:

1. **Soil Testing First**:
   - Get a Soil Health Card (मृदा स्वास्थ्य कार्ड) through your local Krishi Vigyan Kendra (KVK) or agriculture department to understand exact N-P-K and micronutrient deficiencies.

2. **Add Organic Matter**:
   - Apply 5-10 tons/hectare of well-decomposed Farm Yard Manure (FYM) or 2-3 tons of Vermicompost (केंचुआ खाद) before sowing.
   - Organic carbon should ideally be above 0.75% for healthy soil microbial activity.

3. **Green Manuring (हरी खाद)**:
   - Grow Dhaincha (Sesbania) or Sunnhemp (Sanai) during summer or pre-Kharif, and incorporate into the soil at 45-50 days before flowering. This adds 60-80 kg natural Nitrogen per hectare.

4. **Crop Rotation with Legumes**:
   - Rotate cereal crops (wheat, rice) with pulse crops (gram, moong, urad, arhar) which fix atmospheric nitrogen naturally.

5. **Biofertilizers & Microbial Inoculants**:
   - Treat seeds or soil with Azotobacter, Rhizobium, and Phosphate Solubilizing Bacteria (PSB) to boost nutrient uptake by 20-25%.

*Tip: Avoid burning crop residue (parali). In-situ mulching preserves earthworms and retains soil moisture.*`,
    hi: `खेत की मिट्टी की उर्वरा शक्ति (उपजाऊपन) बढ़ाने के मुख्य उपाय:

1. **मृदा स्वास्थ्य परीक्षण (Soil Test)**:
   - निकटतम कृषि विज्ञान केंद्र (KVK) से मिट्टी की जांच कराएं और 'मृदा स्वास्थ्य कार्ड' प्राप्त करें ताकि जरूरी पोषक तत्वों (N-P-K और सूक्ष्म तत्व) की सही मात्रा पता चले।

2. **जैविक खाद का प्रयोग**:
   - बुवाई से पहले 5-10 टन/हेक्टेयर अच्छी तरह सड़ी गोबर की खाद (FYM) या 2-3 टन वर्मीकम्पोस्ट (केंचुआ खाद) डालें। इससे मिट्टी में जीवांश कार्बन (Organic Carbon) बढ़ता है।

3. **हरी खाद (Green Manuring)**:
   - गर्मियों या खरीफ से पहले ढैंचा या सनई की बुवाई करें और 45-50 दिन बाद फूल आने से पहले मिट्टी में जोत दें। इससे प्रति हेक्टेयर 60-80 किलो प्राकृतिक नाइट्रोजन मिलता है।

4. **फसल चक्र (दलहनी फसलें)**:
   - अनाज वाली फसलों (धान, गेहूं) के बाद मूंग, उड़द या चना जैसी दलहनी फसलें लगाएं जो जड़ों में नाइट्रोजन स्थिर करती हैं।

5. **जीवामृत व बायोफर्टिलाइजर**:
   - देसी गाय के गोबर, गोमूत्र, बेसन, गुड़ से बना जीवामृत खेत में दें, और राइजोबियम या पीएसबी (PSB) से बीज उपचार करें।

*सलाह: फसल अवशेष (पराली) न जलाएं; इसे मिट्टी में मिलाकर मल्चिंग करें।*`,
  },
  {
    patterns: [
      /pest|insect|caterpillar|borer|aphid|whitefly/i,
      /control\s*pest/i,
      /keede|kida|keet|rog|patte\s*kat/i,
      /कीट|कीड़े|कीट\s*नियंत्रण|सुंडी|माहू/i,
    ],
    en: `Effective Pest Management (Integrated Pest Management - IPM):

1. **Natural & Organic Sprays (Neem Astra)**:
   - Spray Neem Seed Kernel Extract (5%) or Neem Oil (1500-3000 ppm) at 3-5 ml per liter of water. It acts as an antifeedant and insect repellent without harming beneficial insects.

2. **Mechanical & Physical Traps**:
   - **Yellow Sticky Traps**: Place 15-20 traps per acre at crop canopy level to catch sucking pests like aphids, jassids, and whiteflies.
   - **Pheromone Traps**: Use 4-5 traps per acre for early detection of fruit and shoot borers.
   - **Light Traps**: Use at night to catch nocturnal moths and beetles.

3. **Biological Control**:
   - Spray *Trichoderma viride* or *Beauveria bassiana* (5g/liter) for biological control of soil-borne fungi and caterpillars.

4. **Safety & Advisory**:
   - Avoid spraying during peak sunshine (11 AM - 3 PM) or right before rain. Always wear a mask and gloves.
   - For chemical recommendations, consult your local KVK or Call Centre (Toll-free 1800-180-1551) with exact crop and symptom details.`,
    hi: `फसलों में कीट प्रबंधन (IPM) के कारगर उपाय:

1. **नीम अस्त्र व जैविक छिड़काव**:
   - नीम का तेल (1500-3000 ppm) 3-5 मिली प्रति लीटर पानी में मिलाकर छिड़कें। यह माहू, सफेद मक्खी, और सूंडी जैसे कीटों को बिना मित्र कीटों को नुकसान पहुंचाए रोकता है।

2. **ट्रैप (फंदे) का प्रयोग**:
   - **पीले चिपचिपे कार्ड (Yellow Sticky Traps)**: खेत में 15-20 कार्ड प्रति एकड़ लगाएं। रस चूसक कीट इस पर चिपक जाते हैं।
   - **फेरोमोन ट्रैप**: फल व तना छेदक के लिए 4-5 ट्रैप प्रति एकड़ लगाएं।
   - **प्रकाश प्रपंच (Light Trap)**: रात में हानिकारक पतंगों को नष्ट करने में मदद करता है।

3. **मित्र फफूंद (जैव नियंत्रण)**:
   - सुंडी और कीटों के लिए ब्यूवेरिया बासियाना (5 ग्राम/लीटर) का छिड़काव करें।

4. **सावधानी**:
   - तेज धूप या हवा में छिड़काव न करें। रासायनिक कीटनाशक के प्रयोग से पहले स्थानीय कृषि अधिकारी या किसान कॉल सेंटर (1800-180-1551) से परामर्श लें।`,
  },
  {
    patterns: [
      /yellow\s*(leaf|leaves|foliage)/i,
      /patte\s*(peele|pile|sukhe)/i,
      /patti\s*(peeli|pili)/i,
      /पत्ते\s*पीले|पत्तियां\s*पीली|पीलापन/i,
      /chlorosis/i,
    ],
    en: `Why Crop Leaves Turn Yellow and What To Do:

1. **Nitrogen Deficiency**:
   - *Symptoms*: Older lower leaves turn pale yellow first, starting from the tip along the midrib.
   - *Solution*: Apply light dose of Urea or foliar spray of 1-2% Urea solution or liquid Nano Urea (2-4 ml/liter).

2. **Waterlogging / Poor Drainage**:
   - *Symptoms*: Uniform yellowing across plants due to lack of oxygen in root zone.
   - *Solution*: Drain excess stagnant water from the field immediately and aerate the soil.

3. **Zinc or Iron Deficiency (Chlorosis)**:
   - *Symptoms*: Younger upper leaves show yellowing between veins (veins remain green).
   - *Solution*: Spray Zinc Sulphate (0.5%) + 0.25% lime or Ferrous Sulphate (0.5%) on foliage.

4. **Fungal or Root Rot Attack**:
   - *Symptoms*: Yellowing accompanied by wilting or dark patches on stems/roots.
   - *Solution*: Drench root zone with Trichoderma viride or Copper Oxychloride (2.5g/liter).`,
    hi: `फसल की पत्तियों में पीलापन आने के कारण और समाधान:

1. **नाइट्रोजन की कमी**:
   - *लक्षण*: पौधे की निचली पुरानी पत्तियां पहले पीली पड़ती हैं।
   - *उपाय*: यूरिया की हल्की मात्रा दें या 1-2% यूरिया / नैनो यूरिया (2-4 मिली/लीटर) का पत्तों पर छिड़काव करें।

2. **जलभराव (पानी रुकना)**:
   - *लक्षण*: खेत में पानी भरने से जड़ों को हवा नहीं मिलती और पौधे पीले पड़ जाते हैं।
   - *उपाय*: खेत से अतिरिक्त पानी निकालने की तुरंत व्यवस्था करें।

3. **जिंक या आयरन (लोहे) की कमी**:
   - *लक्षण*: नई ऊपरी पत्तियों की नसें हरी रहती हैं और बीच का भाग पीला हो जाता है।
   - *उपाय*: जिंक सल्फेट (0.5%) या फेरस सल्फेट का छिड़काव करें।

4. **जड़ गलन या फफूंद रोग**:
   - *लक्षण*: पत्तियां पीली होकर मुरझाने लगती हैं।
   - *उपाय*: ट्राइकोडर्मा विरिडी या कॉपर ऑक्सीक्लोराइड (2.5 ग्राम/लीटर) से जड़ों के पास ड्रेंचिंग करें।`,
  },
  {
    patterns: [
      /pm\s*kisan|pmkisan|samman\s*nidhi/i,
      /पीएम\s*किसान|सम्मान\s*निधि/i,
      /6000/i,
    ],
    en: `Pradhan Mantri Kisan Samman Nidhi (PM-KISAN):

- **Benefit**: ₹6,000 per year directly transferred to bank accounts in 3 equal installments of ₹2,000 every 4 months.
- **Eligibility**:
  1. Small and marginal farmer families with cultivable landholding in their name.
  2. Institutional landholders and high-income taxpayers (above threshold) are excluded.
- **Mandatory Requirements**:
  1. **Land Record Seeding**: Khatauni/RoR linked to farmer profile.
  2. **e-KYC**: Completed via OTP on pmkisan.gov.in or biometric at CSC.
  3. **Aadhaar-Seeded Bank Account**: Bank account mapped on NPCI DBT mapper.
- **Check Status**: Visit pmkisan.gov.in -> 'Know Your Status' using your Registration Number or Mobile number.`,
    hi: `प्रधानमंत्री किसान सम्मान निधि (PM-KISAN):

- **लाभ**: प्रतिवर्ष ₹6,000 सीधे बैंक खाते में (₹2,000 की 3 समान किश्तों में)।
- **पात्रता**:
  1. ऐसे सभी किसान परिवार जिनके नाम कृषि योग्य भूमि दर्ज है।
  2. संस्थागत भू-धारक और आयकर दाता इस योजना के पात्र नहीं हैं।
- **अनिवार्य शर्तें**:
  1. **भूलेख अंकन (Land Seeding)**: खतौनी का विवरण पोर्टल पर दर्ज होना चाहिए।
  2. **ई-केवाईसी (e-KYC)**: pmkisan.gov.in पर ओटीपी द्वारा या सीएससी (CSC) केंद्र से बायोमेट्रिक सत्यापन।
  3. **आधार सीडेड बैंक खाता**: बैंक खाता आधार व एनपीसीआई (NPCI) से लिंक होना जरूरी है।
- **स्थिति जांचें**: pmkisan.gov.in पर 'Know Your Status' विकल्प में जाकर पंजीकरण संख्या से चेक करें।`,
  },
  {
    patterns: [
      /kcc|kisan\s*credit\s*card|credit\s*card|fasal\s*rin|crop\s*loan/i,
      /केसीसी|किसान\s*क्रेडिट|फसल\s*ऋण|कर्ज/i,
    ],
    en: `Kisan Credit Card (KCC) Scheme:

- **Purpose**: Timely and affordable short-term credit for crops, seeds, fertilizers, and farm equipment.
- **Interest Rate**:
  - Baseline rate: 7% per annum.
  - With prompt repayment incentive (3% subvention), effective interest rate is just **4% per annum**.
- **Credit Limit**:
  - Up to ₹3 Lakh at subsidized interest.
  - Collateral-free loan up to **₹1.60 Lakh** (no mortgage required).
- **Documents Needed**:
  1. Aadhaar Card & PAN Card.
  2. Land ownership record (Khatauni / Revenue Extract).
  3. Crop sowing declaration / No-dues certificate.
- **How to Apply**: Visit your nearest rural bank, cooperative society, or apply online at your bank's portal.`,
    hi: `किसान क्रेडिट कार्ड (KCC) योजना:

- **उद्देश्य**: फसल बुवाई, खाद, बीज और कृषि कार्यों के लिए सस्ती ब्याज दर पर ऋण।
- **ब्याज दर**:
  - सामान्य दर: 7% वार्षिक।
  - समय पर ऋण चुकाने पर 3% की छूट, प्रभावी ब्याज दर मात्र **4% वार्षिक** रह जाती है।
- **ऋण सीमा**:
  - ₹3 लाख तक का ऋण रियायती ब्याज दर पर।
  - **₹1.60 लाख तक बिना किसी बंधक (Collateral-free)** के ऋण उपलब्ध।
- **आवश्यक दस्तावेज**:
  1. आधार कार्ड व पैन कार्ड।
  2. जमीन के दस्तावेज (खतौनी / जमाबंदी)।
  3. फसल बुवाई का स्व-घोषणा पत्र।
- **आवेदन कैसे करें**: अपनी नजदीकी ग्रामीण बैंक, सहकारी बैंक या सीएससी केंद्र से संपर्क करें।`,
  },
  {
    patterns: [
      /fasal\s*bima|pmfby|crop\s*insurance/i,
      /फसल\s*बीमा|पीएमएफबीवाई/i,
    ],
    en: `Pradhan Mantri Fasal Bima Yojana (PMFBY):

- **Coverage**: Comprehensive risk insurance against natural disasters (drought, flood, unseasonal hail, pests, landslide).
- **Low Premium Rates for Farmers**:
  - Kharif crops (Paddy, Maize, Soybean): Only **2%** of sum insured.
  - Rabi crops (Wheat, Mustard, Gram): Only **1.5%** of sum insured.
  - Commercial / Horticultural crops: Only **5%** of sum insured.
  - The remaining premium subsidy is paid by Central and State Governments.
- **Claim Process in Case of Damage**:
  - Intimate crop loss within **72 hours** through the 'Crop Insurance App' or Toll-free 14447 or your local bank/agriculture department.`,
    hi: `प्रधानमंत्री फसल बीमा योजना (PMFBY):

- **सुरक्षा कवरेज**: सूखा, बाढ़, बेमौसम बारिश, ओलावृष्टि और कीटों से फसल नष्ट होने पर वित्तीय सुरक्षा।
- **किसान के लिए बहुत कम प्रीमियम**:
  - खरीफ फसलें (धान, मक्का आदि): बीमित राशि का मात्र **2%**।
  - रबी फसलें (गेहूं, सरसों, चना): मात्र **1.5%**।
  - बागवानी व नकदी फसलें: मात्र **5%**।
  - बाकी प्रीमियम सरकार द्वारा वहन किया जाता है।
- **नुकसान होने पर दावा**:
  - फसल नुकसान के **72 घंटे के भीतर** 'Crop Insurance App' पर सूचना दें या टोल-फ्री 14447 पर कॉल करें।`,
  },
  {
    patterns: [
      /kusum|solar\s*pump|solar/i,
      /कुसुम|सोलर\s*पंप/i,
    ],
    en: `PM-KUSUM Scheme (Solar Agriculture Pumps):

- **Benefit**: Up to 60% government subsidy to install standalone solar water pumps (3 HP to 10 HP) and solarize existing grid-connected electric/diesel pumps.
- **Cost Sharing**:
  - Central Government: 30% subsidy.
  - State Government: 30% subsidy.
  - Bank loan available: Up to 30%.
  - Farmer contribution: Only **10% to 40%** upfront.
- **Benefits**:
  - Zero diesel expenditure and reliable daytime irrigation.
  - Extra income by selling surplus solar electricity back to the grid.`,
    hi: `पीएम कुसुम योजना (सोलर पंप):

- **लाभ**: किसानों को सिंचाई के लिए 3 से 10 एचपी तक के सोलर पंप पर **60% तक सरकारी अनुदान (सब्सिडी)**।
- **लागत विवरण**:
  - केंद्र सरकार: 30% सब्सिडी।
  - राज्य सरकार: 30% सब्सिडी।
  - बैंक ऋण: 30% तक उपलब्ध।
  - किसान का अंश: केवल **10% से 40%**।
- **फायदे**:
  - डीजल व बिजली के बिल से मुक्ति, दिन के समय निर्बाध सिंचाई।
  - अतिरिक्त सौर ऊर्जा को ग्रिड में बेचकर अतिरिक्त आमदनी का साधन।`,
  },
  {
    patterns: [
      /drip|sprinkler|irrigation|sinchai|water\s*management/i,
      /सिंचाई|ड्रिप|टपक|फव्वारा|पानी/i,
    ],
    en: `Smart Irrigation & Water Management:

1. **Drip Irrigation (टपक सिंचाई)**:
   - Delivers water directly to plant root zone.
   - Saves up to 50-70% water compared to flood irrigation and boosts yields by 30-40%.
   - Fertilizers can be supplied via fertigation with zero wastage.

2. **Sprinkler Irrigation (फव्वारा सिंचाई)**:
   - Ideal for undulating land and crops like wheat, pulses, and oilseeds.

3. **Government Subsidy (PMKSY - Per Drop More Crop)**:
   - Small & marginal farmers get up to **55% to 80% subsidy** on drip and sprinkler installation depending on state policy.
   - Apply on your state agriculture/horticulture department portal.`,
    hi: `सूक्ष्म सिंचाई एवं जल प्रबंधन:

1. **ड्रिप सिंचाई (टपक सिंचाई)**:
   - पानी सीधे पौधे की जड़ों तक पहुंचता है।
   - परंपरागत सिंचाई की तुलना में 50-70% पानी की बचत और 30-40% अधिक पैदावार।
   - 'फर्टिगेशन' द्वारा खाद सीधे जड़ों तक पहुंचाई जा सकती है।

2. **फव्वारा (स्प्रिंकलर) सिंचाई**:
   - गेहूं, सरसों, चना और असमतल खेतों के लिए सर्वोत्तम।

3. **सरकारी अनुदान (PMKSY - प्रति बूंद अधिक फसल)**:
   - लघु व सीमांत किसानों को ड्रिप व स्प्रिंकलर लगाने पर **55% से 80% तक सब्सिडी** मिलती है।
   - अपने जिले के उद्यानिकी या कृषि विभाग में संपर्क करें।`,
  },
  {
    patterns: [
      /organic|jeevamrut|vermicompost|compost|jaivik|khad/i,
      /जीवामृत|जैविक\s*खाद|केंचुआ\s*खाद|वर्मीकम्पोस्ट/i,
    ],
    en: `Preparation of Jeevamrut (जैविक खेती हेतु प्राकृतिक खाद):

**Ingredients for 200 Liters of Jeevamrut (for 1 Acre)**:
1. Fresh Desi Cow Dung: 10 kg
2. Cow Urine (Gomutra): 5 to 10 liters
3. Jaggery (Gur): 1 to 2 kg (natural activator)
4. Gram flour (Besan): 1 to 2 kg (protein source for microbes)
5. Live fertile soil from farm bund/tree base: 1 handful
6. Clean water: 200 liters

**Method**:
- Mix all ingredients in a plastic drum, stir clockwise with a wooden stick twice daily.
- Keep in shade covered with a jute gunny bag for 48 to 72 hours.
- Apply with irrigation water or filter and spray on crops at 10% dilution.`,
    hi: `जीवामृत बनाने की विधि (एक एकड़ खेत के लिए):

**आवश्यक सामग्री (200 लीटर जीवामृत हेतु)**:
1. देसी गाय का ताजा गोबर: 10 किलो
2. गोमूत्र: 5 से 10 लीटर
3. पुराना गुड़: 1 से 2 किलो
4. दाल/चने का बेसन: 1 से 2 किलो
5. खेत की मेड़ या बरगद के नीचे की सजीव मिट्टी: एक मुट्ठी
6. साफ पानी: 200 लीटर

**बनाने की विधि**:
- प्लास्टिक के ड्रम में पानी भरकर सभी सामग्री अच्छी तरह घोल लें।
- ड्रम को छांव में रखें और बोरी से ढकें। सुबह-शाम लकड़ी के डंडे से घड़ी की दिशा में 2 मिनट हिलाएं।
- 3 से 4 दिन में जीवामृत तैयार हो जाता है। इसे सिंचाई के पानी के साथ चलाएं या 10% पानी में मिलाकर छिड़कें।`,
  },
  {
    patterns: [
      /^(hi|hello|hey|namaste|pranam|ram\s*ram|kisan\s*sahayak)\b/i,
      /^(नमस्ते|प्रणाम|राम\s*राम|जय\s*जवान|जय\s*किसान)\b/i,
    ],
    en: `Namaste! I am **Kisan Sahayak**, your personal AI agricultural assistant on KisanSarthi.

Here is how I can assist you:
- **Government Schemes**: PM-KISAN, Kisan Credit Card (KCC), PM Fasal Bima, PM-KUSUM Solar Pump, and state subsidies.
- **Crop Health & Disease**: Identify causes of yellow leaves, blight, root rot, and pest attacks.
- **Soil & Fertilizers**: Soil testing guidance, organic manures, vermicompost, and Jeevamrut preparation.
- **Water Management**: Drip and sprinkler subsidies and schedules.
- **Eligibility Checking**: Using KisanSarthi's scheme tools and document preparation.

What crop or topic would you like assistance with today?`,
    hi: `नमस्ते किसान भाई! मैं आपका **किसान सहायक** हूँ — किसानसारथी पर आपका डिजिटल कृषि मित्र।

मैं आपकी इन विषयों में मदद कर सकता हूँ:
- **सरकारी योजनाएं**: पीएम-किसान, किसान क्रेडिट कार्ड (KCC), फसल बीमा (PMFBY), सोलर पंप (कुसुम) आदि।
- **फसल सुरक्षा व रोग**: पत्तों का पीलापन, कीट व सुंडी नियंत्रण, फफूंद रोग व उपाय।
- **मिट्टी व खाद**: मृदा परीक्षण, जैविक खाद, वर्मीकम्पोस्ट और जीवामृत बनाने की विधि।
- **सिंचाई तकनीक**: ड्रिप और फव्वारा सिंचाई व सरकारी सब्सिडी।
- **पात्रता जांच**: किसानसारथी पोर्टल पर योजनाओं की पात्रता और दस्तावेज तैयार करना।

आज आप अपनी किस फसल या समस्या के बारे में पूछना चाहते हैं?`,
  },
];

const DEFAULT_FALLBACK_EN = `Thank you for reaching out to Kisan Sahayak!

Here is essential guidance for your farming queries:
1. **Soil & Nutrition**: Get your soil tested before applying fertilizers to balance N-P-K and avoid excess chemical usage.
2. **Plant Health**: For any pest or disease symptom, capture a clear picture, identify the crop stage, and inspect leaf undersides.
3. **Official Assistance**:
   - **Kisan Call Centre (Toll-Free)**: **1800-180-1551** (Available 6 AM - 10 PM daily in regional languages).
   - **Local Krishi Vigyan Kendra (KVK)**: Visit your nearest KVK center for customized seed and weather recommendations.
4. **Government Portals**: Explore eligibility on KisanSarthi under **Explore Schemes** or use **Check Eligibility** above.

Feel free to ask about specific crops (wheat, paddy, mustard, potato, sugarcane), soil fertility, pests, or schemes like PM-KISAN and KCC!`;

const DEFAULT_FALLBACK_HI = `किसानसारथी में आपका स्वागत है!

आपकी खेती और फसलों से जुड़े महत्वपूर्ण सुझाव:
1. **मृदा व पोषण**: किसी भी खाद के प्रयोग से पहले मिट्टी की जांच अवश्य कराएं ताकि लागत कम हो और सही पोषण मिले।
2. **फसल सुरक्षा**: यदि फसल में कोई कीट या पीलापन दिखे तो पत्तों की निचली सतह और तने की जांच करें और जल निकासी सही रखें।
3. **मुफ्त कृषि सहायता हेल्पलाइन**:
   - **किसान कॉल सेंटर (टोल-फ्री)**: **1800-180-1551** (सुबह 6 से रात 10 बजे तक अपनी भाषा में परामर्श प्राप्त करें)।
   - **कृषि विज्ञान केंद्र (KVK)**: अपने नजदीकी ब्लॉक या जिले के कृषि केंद्र से सीधे संपर्क करें।
4. **सरकारी योजनाएं**: किसानसारथी पर ऊपर **Explore Schemes** या **Check Eligibility** पर क्लिक करके अपनी पात्रता चेक करें।

आप गेहूं, धान, सरसों, गन्ना, आलू, पीएम-किसान, केसीसी, या खाद-बीज के बारे में कभी भी विस्तार से पूछ सकते हैं!`;

/**
 * Finds the most relevant farming knowledge answer for the user's text.
 */
export function getFarmingAnswer(query: string, lang: "en" | "hi"): string {
  const normalized = query.trim().toLowerCase();
  for (const entry of KNOWLEDGE_BASE) {
    if (entry.patterns.some((pattern) => pattern.test(normalized))) {
      return lang === "hi" ? entry.hi : entry.en;
    }
  }
  return lang === "hi" ? DEFAULT_FALLBACK_HI : DEFAULT_FALLBACK_EN;
}
