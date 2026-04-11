# ============================================================
# FILE: feed/content_library.py
# PURPOSE: Curated library of business improvement content:
#          books, courses, tips, market insights.
#          All content is textile/manufacturing industry relevant.
# ============================================================

BOOKS = [
    {
        'title': 'The Goal',
        'author': 'Eliyahu M. Goldratt',
        'why': 'A novel about manufacturing bottlenecks. Teaches you to find the one constraint slowing your entire factory — and fix it first. Essential for any mill owner.',
        'category': 'Production',
    },
    {
        'title': 'Lean Thinking',
        'author': 'James P. Womack & Daniel T. Jones',
        'why': 'The blueprint for eliminating waste in manufacturing. Directly applicable to textile mills — reduce machine downtime, material waste, and labour inefficiency.',
        'category': 'Production',
    },
    {
        'title': 'The Toyota Way',
        'author': 'Jeffrey Liker',
        'why': 'How Toyota became the world\'s best manufacturer through continuous improvement (Kaizen). Every principle applies to a textile factory floor.',
        'category': 'Production',
    },
    {
        'title': 'Good to Great',
        'author': 'Jim Collins',
        'why': 'Why some companies make the leap from average to excellent and others don\'t. Based on data from 1,435 companies over 40 years.',
        'category': 'Business',
    },
    {
        'title': 'The E-Myth Revisited',
        'author': 'Michael E. Gerber',
        'why': 'Most business owners work IN their business, not ON it. This book teaches you to build systems so your business runs without you.',
        'category': 'Business',
    },
    {
        'title': 'Profit First',
        'author': 'Mike Michalowicz',
        'why': 'A simple cash management system that ensures your business is always profitable — not just busy. Great for small manufacturers.',
        'category': 'Finance',
    },
    {
        'title': 'Never Split the Difference',
        'author': 'Chris Voss',
        'why': 'Negotiation tactics from an FBI hostage negotiator. Directly useful when dealing with suppliers, buyers, and bulk order pricing.',
        'category': 'Sales',
    },
    {
        'title': 'The 80/20 Principle',
        'author': 'Richard Koch',
        'why': '80% of your revenue likely comes from 20% of your customers. This book shows you how to identify and double down on what actually works.',
        'category': 'Sales',
    },
    {
        'title': 'Scaling Up',
        'author': 'Verne Harnish',
        'why': 'A practical playbook for growing a manufacturing business — people, strategy, execution, and cash. Used by thousands of mid-sized companies.',
        'category': 'Business',
    },
    {
        'title': 'The Innovator\'s Dilemma',
        'author': 'Clayton Christensen',
        'why': 'Why successful companies fail when new technology or competition disrupts their market. Critical reading as technical textiles evolve rapidly.',
        'category': 'Strategy',
    },
    {
        'title': 'Zero to One',
        'author': 'Peter Thiel',
        'why': 'How to build a product so good that competitors cannot easily copy it. Relevant for developing proprietary technical textile formulations.',
        'category': 'Strategy',
    },
    {
        'title': 'Blue Ocean Strategy',
        'author': 'W. Chan Kim & Renée Mauborgne',
        'why': 'How to create new market space instead of fighting competitors. Many textile companies move into medical or geotextiles using this thinking.',
        'category': 'Strategy',
    },
    {
        'title': 'Start with Why',
        'author': 'Simon Sinek',
        'why': 'Customers don\'t buy what you make — they buy why you make it. Helps build a brand story that differentiates you in a commodity market.',
        'category': 'Sales',
    },
    {
        'title': 'Measure What Matters',
        'author': 'John Doerr',
        'why': 'The OKR (Objectives and Key Results) system used by Google and Intel. Helps a mill owner set clear targets for every team and track them weekly.',
        'category': 'Business',
    },
    {
        'title': 'The Lean Startup',
        'author': 'Eric Ries',
        'why': 'Build-Measure-Learn. Works beyond startups — use it to test new product lines, new markets, or new processes before committing large capital.',
        'category': 'Strategy',
    },
    {
        'title': 'Export-Import Theory, Practices and Procedures',
        'author': 'Belay Seyoum',
        'why': 'Comprehensive guide to international trade mechanics — letters of credit, incoterms, customs. Essential if you are exporting or planning to.',
        'category': 'Export',
    },
    {
        'title': 'Reengineering the Corporation',
        'author': 'Michael Hammer & James Champy',
        'why': 'How to fundamentally redesign business processes for dramatic improvement. Many textile mills can cut lead time 40% by rethinking how orders flow.',
        'category': 'Production',
    },
    {
        'title': 'The Checklist Manifesto',
        'author': 'Atul Gawande',
        'why': 'How simple checklists prevent costly errors. Directly applicable to quality control in textile manufacturing — reduce rejections with checklists.',
        'category': 'Quality',
    },
]

COURSES = [
    {
        'title': 'ISO 9001 Quality Management Systems',
        'platform': 'Bureau Veritas / SGS',
        'why': 'ISO 9001 certification opens doors to global buyers and tenders. Most large infrastructure and medical companies require it from suppliers.',
        'category': 'Quality',
        'level': 'All levels',
    },
    {
        'title': 'Lean Manufacturing Fundamentals',
        'platform': 'Coursera / SME',
        'why': 'Learn 5S, value stream mapping, and waste elimination. Typically reduces production costs 15–25% in first implementation year.',
        'category': 'Production',
        'level': 'Beginner–Intermediate',
    },
    {
        'title': 'Export Documentation & Procedures',
        'platform': 'FIEO / Indian Institute of Foreign Trade',
        'why': 'Master shipping bills, GST refunds, RCMC registration, and letter of credit. Required knowledge if you want to export technical textiles.',
        'category': 'Export',
        'level': 'Beginner',
    },
    {
        'title': 'Geosynthetics — Design & Application',
        'platform': 'IGS (International Geosynthetics Society) / IACMAG',
        'why': 'Technical textile manufacturers entering the geotextile space need to understand civil engineering applications — this course bridges that gap.',
        'category': 'Technical',
        'level': 'Intermediate',
    },
    {
        'title': 'Financial Accounting for Non-Finance Managers',
        'platform': 'Udemy / ICAI',
        'why': 'Understanding your own P&L, balance sheet, and cash flow statements helps you make faster, better decisions without waiting for an accountant.',
        'category': 'Finance',
        'level': 'Beginner',
    },
    {
        'title': 'Digital Marketing for B2B Manufacturers',
        'platform': 'LinkedIn Learning / HubSpot Academy',
        'why': 'Most technical textile buyers search on Google before contacting suppliers. A well-optimised website and LinkedIn presence generates inbound inquiries.',
        'category': 'Sales',
        'level': 'Beginner',
    },
    {
        'title': 'Supply Chain Management',
        'platform': 'Coursera (MIT) / APICS',
        'why': 'Optimise raw material procurement, reduce inventory costs, and build resilient supplier relationships — critical for any manufacturer.',
        'category': 'Production',
        'level': 'Intermediate',
    },
    {
        'title': 'Medical Textile Standards (ISO 13485)',
        'platform': 'TÜV SÜD / BSI Group',
        'why': 'ISO 13485 is mandatory for selling medical textiles to hospitals or pharma companies. Getting certified now positions you for this high-margin market.',
        'category': 'Medical',
        'level': 'Intermediate',
    },
    {
        'title': 'GST & Taxation for Manufacturers',
        'platform': 'ICAI / ClearTax',
        'why': 'Understanding GST input credits, HSN codes, and export LUT can save 3–5% on every transaction. Most mills overpay simply due to misclassification.',
        'category': 'Finance',
        'level': 'Beginner',
    },
    {
        'title': 'Negotiations and Dealmaking',
        'platform': 'Yale / Coursera',
        'why': 'Structured negotiation training helps you close better deals with suppliers and buyers — even a 2% better price on bulk raw material is significant.',
        'category': 'Sales',
        'level': 'All levels',
    },
]

TIPS = [
    {
        'title': 'Run a 5S audit on your production floor this week',
        'body': 'Sort, Set in order, Shine, Standardise, Sustain. A basic 5S audit takes 2 hours and typically reveals ₹50,000–₹2L worth of hidden waste in tools, materials, and motion.',
        'category': 'Production',
        'icon': 'factory',
    },
    {
        'title': 'Call your top 5 customers — just to check in',
        'body': 'Not to sell. Just to ask: "Is everything working for you? Is there anything we can improve?" This one habit prevents most churn. Top customers leave silently.',
        'category': 'Sales',
        'icon': 'phone',
    },
    {
        'title': 'Review your invoice-to-payment cycle',
        'body': 'If your average payment is taking 45+ days, you are financing your customers. Send invoices the same day as dispatch. Add WhatsApp payment reminders at Day 20, 30, and 40.',
        'category': 'Finance',
        'icon': 'payments',
    },
    {
        'title': 'Standardise your 3 most common product specifications',
        'body': 'Custom specs for every order increases production cost and error rate. Identify your 3 highest-volume products and create a fixed spec sheet. Offer custom as a premium.',
        'category': 'Production',
        'icon': 'settings',
    },
    {
        'title': 'Create one-page data sheets for each of your top 5 products',
        'body': 'Buyers make faster decisions when they receive a clear technical data sheet with GSM, tensile strength, applications, and certifications. A PDF takes 1 hour to make.',
        'category': 'Sales',
        'icon': 'description',
    },
    {
        'title': 'Check your minimum stock levels — are they realistic?',
        'body': 'Set reorder levels based on your actual lead time from suppliers, not guesses. If raw material delivery takes 10 days and daily consumption is 50 kg, reorder at 600 kg minimum.',
        'category': 'Inventory',
        'icon': 'inventory',
    },
    {
        'title': 'Track machine downtime for 2 weeks',
        'body': 'You cannot improve what you do not measure. Log every machine stoppage — reason and duration. After 2 weeks, you will clearly see your single biggest production bottleneck.',
        'category': 'Production',
        'icon': 'timer',
    },
    {
        'title': 'Offer payment discounts for early settlement',
        'body': 'A 1% discount for payment within 10 days (vs 30 days) costs you 1% but improves your cash flow by 20 days. Often worth it more than a bank overdraft.',
        'category': 'Finance',
        'icon': 'percent',
    },
    {
        'title': 'Photograph every product you make — build a library',
        'body': 'Good product photos on WhatsApp, email, or a website dramatically increase response rates from buyers. Use a white background, natural light, and show texture clearly.',
        'category': 'Sales',
        'icon': 'photo_camera',
    },
    {
        'title': 'Calculate your actual cost per meter/kg for top 3 products',
        'body': 'Most manufacturers guess their costs. Do a full costing: raw material + power + labour + overhead per unit. You may find some products are losing money at current market prices.',
        'category': 'Finance',
        'icon': 'calculate',
    },
    {
        'title': 'Identify your top 3 customers and understand why they stay',
        'body': 'Ask them directly: "Why do you keep buying from us?" The answers reveal your real competitive advantage — which is often not what you think it is.',
        'category': 'Sales',
        'icon': 'star',
    },
    {
        'title': 'Build a daily production target board visible on the floor',
        'body': 'A simple whiteboard showing today\'s target vs actual output, updated every 2 hours, improves labour productivity by 10–20% with zero cost.',
        'category': 'Production',
        'icon': 'bar_chart',
    },
    {
        'title': 'Review and renegotiate your top 3 raw material contracts yearly',
        'body': 'Suppliers give better prices to buyers who ask. Annual renegotiation, backed by competitor quotes, typically saves 3–7% on raw material cost.',
        'category': 'Finance',
        'icon': 'handshake',
    },
    {
        'title': 'Map your customer\'s supply chain, not just your own',
        'body': 'Understanding what your buyer does downstream helps you sell better. If your customer sells to construction companies, knowing their pain points lets you offer solutions, not just fabric.',
        'category': 'Sales',
        'icon': 'account_tree',
    },
    {
        'title': 'Schedule monthly energy audits',
        'body': 'Energy is typically 15–25% of a textile mill\'s operating cost. A basic audit by a certified energy auditor (cost: ₹15,000–₹30,000) often identifies ₹2–10L in annual savings.',
        'category': 'Production',
        'icon': 'bolt',
    },
    {
        'title': 'Send monthly performance reports to key customers',
        'body': 'A one-page summary: orders placed, delivered, quality pass rate, and upcoming products. Customers who receive regular reports churn 60% less than those who don\'t.',
        'category': 'Sales',
        'icon': 'summarize',
    },
    {
        'title': 'Document your top 10 processes as simple flowcharts',
        'body': 'If only one person knows how something is done, your business is fragile. Document it in one hour. This reduces training time and error rate significantly.',
        'category': 'Production',
        'icon': 'schema',
    },
    {
        'title': 'Analyse your product rejection rate by machine',
        'body': 'If one loom or machine produces 3x more rejections than others, it is a maintenance or calibration issue. Fix it before the cost compounds further.',
        'category': 'Quality',
        'icon': 'error',
    },
]

MARKET_INSIGHTS = [
    {
        'title': 'Geotextile demand in India growing at 12–15% CAGR',
        'body': 'Government infrastructure spending (roads, railways, drainage) is the primary driver. PMGSY rural roads program alone requires 8,000+ km of fabric-reinforced roads annually. Positioning now pays off in 2–3 years.',
        'category': 'Market',
        'icon': 'trending_up',
    },
    {
        'title': 'Medical textile market in India: ₹19,000 Cr and growing',
        'body': 'Post-COVID hospital expansion across Tier 2 and Tier 3 cities is creating strong demand for surgical drapes, bandages, and infection control fabrics. ISO 13485 and EN 13795 certifications are the entry ticket.',
        'category': 'Market',
        'icon': 'local_hospital',
    },
    {
        'title': 'China+1 strategy creating export opportunities for Indian textile makers',
        'body': 'Global buyers — especially in Europe and the US — are actively diversifying away from Chinese suppliers. Indian technical textile manufacturers with quality certifications and English documentation are well-positioned.',
        'category': 'Export',
        'icon': 'public',
    },
    {
        'title': 'EU Deforestation Regulation (EUDR) will affect textile supply chains',
        'body': 'From December 2025, EU importers must prove products are not linked to deforestation. If you source natural fibres, track your supply chain now to avoid export disruption.',
        'category': 'Regulation',
        'icon': 'policy',
    },
    {
        'title': 'BIS certification now mandatory for certain technical textiles',
        'body': 'Bureau of Indian Standards (BIS) has expanded mandatory certification to geotextiles used in government road projects. ISI mark is now required for road tender qualification in many states.',
        'category': 'Regulation',
        'icon': 'verified',
    },
    {
        'title': 'Nonwoven technical textiles: fastest growing segment globally',
        'body': 'Nonwoven fabrics are projected to reach $60B globally by 2028 (CAGR 6.5%). Applications: filtration, hygiene, automotive, construction. If your mill can pivot a loom, this market is worth evaluating.',
        'category': 'Market',
        'icon': 'trending_up',
    },
    {
        'title': 'PLI scheme for technical textiles — apply before deadline',
        'body': 'The Production Linked Incentive scheme for MMF/technical textiles offers 3–15% incentive on incremental sales. Check Ministry of Textiles portal for current open cohorts.',
        'category': 'Government',
        'icon': 'account_balance',
    },
    {
        'title': 'Raw material price watch: polypropylene resin trending up',
        'body': 'Global PP resin prices have risen 8–12% in the past quarter due to crude oil price movement and Asian demand. Review your pricing on long-term orders to protect margins.',
        'category': 'Supply',
        'icon': 'local_shipping',
    },
    {
        'title': 'Agrotextile market: crop protection fabric demand surging in South India',
        'body': 'Tamil Nadu and Andhra Pradesh farmers are adopting shade nets, crop covers, and mulch films rapidly. State government subsidies of 40–60% are in place. Direct farmer relationships or agricultural dealers can be valuable channels.',
        'category': 'Market',
        'icon': 'agriculture',
    },
    {
        'title': 'Recycled content requirements entering global procurement',
        'body': 'Major European and US buyers are requiring minimum 20–30% recycled content in textile products as part of their sustainability commitments. This is becoming a qualification criterion, not just a preference.',
        'category': 'Sustainability',
        'icon': 'recycling',
    },
]
