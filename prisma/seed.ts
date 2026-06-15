import { PrismaClient, BookingStatus, BookingSource, EventType, InvoiceStatus, IntraInterState, LeadStatus, BackgroundCheckStatus, StaffRole, GstTreatment } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding VenueOS database...");

  // ── Organization ──────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "grand-palace" },
    update: {},
    create: {
      name: "Grand Palace Venues Pvt. Ltd.",
      slug: "grand-palace",
      supportEmail: "support@grandpalace.in",
      supportPhone: "+91 98765 43210",
    },
  });

  // ── Legal Entity ──────────────────────────────────────────────
  const legal = await prisma.legalEntity.upsert({
    where: { gstin: "29AABCG1234N1Z5" },
    update: {},
    create: {
      organizationId: org.id,
      legalName: "Grand Palace Venues Pvt. Ltd.",
      tradeName: "Grand Palace Venues",
      gstin: "29AABCG1234N1Z5",
      pan: "AABCG1234N",
      stateCode: "29",
      stateName: "Karnataka",
      regAddressLine1: "No. 42, Outer Ring Road, Marathahalli",
      regCity: "Bengaluru",
      regState: "Karnataka",
      regPincode: "560037",
      invoicePrefix: "VOS",
      invoiceCounter: 45,
    },
  });

  // ── Bank Account ──────────────────────────────────────────────
  await prisma.bankAccount.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      legalEntityId: legal.id,
      bankName: "HDFC Bank",
      branchName: "Marathahalli Branch",
      accountName: "Grand Palace Venues Pvt. Ltd.",
      accountNumber: "50100123456789",
      ifscCode: "HDFC0001234",
      accountType: "Current",
      upiId: "grandpalace@hdfcbank",
      isPrimary: true,
    },
  });

  // ── Property ──────────────────────────────────────────────────
  const property = await prisma.property.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "grand-palace-main" } },
    update: {},
    create: {
      organizationId: org.id,
      legalEntityId: legal.id,
      name: "Grand Palace Venues",
      slug: "grand-palace-main",
      propertyType: "BANQUET_HALL",
      addressLine1: "No. 42, Outer Ring Road, Marathahalli",
      city: "Bengaluru",
      state: "Karnataka",
      stateCode: "29",
      pincode: "560037",
      phone: "+91 98765 43210",
      email: "events@grandpalace.in",
      websiteUrl: "https://grandpalace.in",
      coverImageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1600",
      totalCapacity: 1600,
      parkingCapacity: 500,
      amenities: ["AC", "Valet Parking", "PA System", "AV", "Catering Kitchen", "Generator", "Wi-Fi", "CCTV"],
      venuePortalConfig: {
        tagline: "Bengaluru's Premier Event Destination",
        description: "Grand Palace Venues offers world-class banquet halls, lush lawns, and state-of-the-art convention spaces nestled in the heart of Bengaluru. With over 20 years of experience hosting weddings, corporate events, and social gatherings, we bring your vision to life.",
        promoVideoUrl: "",
        gallery: [
          "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
          "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800",
          "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
          "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800",
          "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800",
          "https://images.unsplash.com/photo-1470753937643-efeb931202a9?w=800",
        ],
        facilities: [
          { icon: "❄️", name: "Central Air Conditioning", desc: "Temperature-controlled halls for all seasons", photo: "" },
          { icon: "🅿️", name: "Valet Parking", desc: "Complimentary valet for up to 500 vehicles", photo: "" },
          { icon: "🎤", name: "Professional PA System", desc: "High-end Bose & JBL sound throughout", photo: "" },
          { icon: "💡", name: "Decorative Lighting", desc: "Programmable LED & chandeliers", photo: "" },
          { icon: "🍽️", name: "Catering Kitchen", desc: "Full commercial kitchen on-site", photo: "" },
          { icon: "🎥", name: "AV & Projectors", desc: "4K projectors with 16ft screens", photo: "" },
          { icon: "📶", name: "High-Speed Wi-Fi", desc: "1 Gbps dedicated event internet", photo: "" },
          { icon: "🔒", name: "24/7 Security", desc: "CCTV & licensed security personnel", photo: "" },
        ],
        spaces: [
          { name: "Grand Ballroom", capacity: "Up to 800 guests", rateFrom: "₹1,50,000", desc: "Our flagship 12,000 sq.ft. pillarless hall.", photo: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800" },
          { name: "Terrace + Lawn", capacity: "Up to 500 guests", rateFrom: "₹80,000", desc: "A lush open-air terrace and garden lawn.", photo: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800" },
          { name: "Convention Hall", capacity: "Up to 300 guests", rateFrom: "₹60,000", desc: "A versatile convention space with AV.", photo: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800" },
          { name: "Conference Center", capacity: "Up to 100 guests", rateFrom: "₹25,000", desc: "Intimate boardroom and breakout spaces.", photo: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800" },
        ],
        instagram: "https://instagram.com/grandpalacevenues",
        facebook: "https://facebook.com/grandpalacevenues",
        googleMapsUrl: "https://maps.google.com/?q=Grand+Palace+Venues+Bengaluru",
        logoUrl: "",
      },
    },
  });

  // ── Spaces ────────────────────────────────────────────────────
  const spaceData = [
    { name: "Grand Ballroom",   type: "MAIN_HALL" as const,       cap: 800, rate: 150000 },
    { name: "Terrace + Lawn",   type: "LAWN" as const,            cap: 500, rate: 80000  },
    { name: "Convention Hall",  type: "BANQUET_HALL" as const,    cap: 300, rate: 60000  },
    { name: "Conference Center",type: "CONFERENCE_ROOM" as const, cap: 100, rate: 25000  },
  ];

  const spaces: Record<string, string> = {};
  for (const s of spaceData) {
    const sp = await prisma.space.upsert({
      where: { id: `00000000-0000-0000-0001-${String(spaceData.indexOf(s)+1).padStart(12,"0")}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0001-${String(spaceData.indexOf(s)+1).padStart(12,"0")}`,
        propertyId: property.id,
        name: s.name,
        spaceType: s.type,
        banquetCapacity: s.cap,
        baseRatePerDay: s.rate,
        sacCode: "997212",
        gstRatePercent: 18,
      },
    });
    spaces[s.name] = sp.id;
  }

  // ── Users ─────────────────────────────────────────────────────
  const USERS = [
    { email: "admin@grandpalace.in",   password: "admin123",   role: "SUPER_ADMIN",   first: "Arjun",  last: "Mehta"  },
    { email: "sales@grandpalace.in",   password: "sales123",   role: "SALES_MANAGER", first: "Sneha",  last: "Reddy"  },
    { email: "bde@grandpalace.in",     password: "bde123",     role: "BDE",           first: "Karan",  last: "Mehta"  },
    { email: "ops@grandpalace.in",     password: "ops123",     role: "OPERATIONS",    first: "Vinod",  last: "Sharma" },
    { email: "finance@grandpalace.in", password: "finance123", role: "FINANCE",       first: "Meena",  last: "Joshi"  },
  ] as const;

  const userIds: Record<string, string> = {};
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        organizationId: org.id,
        email: u.email,
        passwordHash: hash,
        firstName: u.first,
        lastName: u.last,
        role: u.role as any,
        isActive: true,
      },
    });
    userIds[u.email] = user.id;
    await prisma.userPropertyAccess.upsert({
      where: { userId_propertyId: { userId: user.id, propertyId: property.id } },
      update: {},
      create: { userId: user.id, propertyId: property.id },
    });
  }

  // ── Clients ───────────────────────────────────────────────────
  const clientData = [
    { name: "Mehta Enterprises",        type: "Company",    gstin: null,             stateCode: "29" },
    { name: "Arjun & Priya Wedding",    type: "Individual", gstin: null,             stateCode: "29" },
    { name: "TechSpark Solutions",      type: "Company",    gstin: "29AABCT5678M1Z3", stateCode: "29" },
    { name: "Karnataka Govt. DEPT",     type: "Govt",       gstin: "29AAAGK0001A1Z5", stateCode: "29" },
    { name: "Sharma Family Reception",  type: "Individual", gstin: null,             stateCode: "29" },
    { name: "Infosys Leadership",       type: "Company",    gstin: "29AAACI1681G1Z7", stateCode: "29" },
    { name: "Patel Wedding Co.",        type: "Individual", gstin: null,             stateCode: "29" },
    { name: "Namma Fintech Conf.",      type: "Company",    gstin: null,             stateCode: "29" },
    { name: "Ramesh Iyer",             type: "Individual", gstin: null,             stateCode: "29" },
    { name: "Wipro Annual Day",         type: "Company",    gstin: "29AAACW0017C1Z1", stateCode: "29" },
    { name: "Priya Nair Wedding",       type: "Individual", gstin: null,             stateCode: "29" },
    { name: "Flipkart Townhall",        type: "Company",    gstin: "29AABCF8749P1Z7", stateCode: "29" },
  ];

  const clientIds: Record<string, string> = {};
  for (const c of clientData) {
    const existing = c.gstin
      ? await prisma.client.findUnique({ where: { gstin: c.gstin } })
      : await prisma.client.findFirst({ where: { displayName: c.name } });
    if (existing) { clientIds[c.name] = existing.id; continue; }
    const client = await prisma.client.create({
      data: {
        legalName: c.name,
        displayName: c.name,
        clientType: c.type,
        gstin: c.gstin,
        gstTreatment: c.gstin ? GstTreatment.REGISTERED_REGULAR : GstTreatment.UNREGISTERED,
        stateCode: c.stateCode,
        stateName: "Karnataka",
        phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        billCity: "Bengaluru",
        billState: "Karnataka",
      },
    });
    clientIds[c.name] = client.id;
  }

  // ── Bookings ──────────────────────────────────────────────────
  const bookingData = [
    { ref:"BK-2425-0101", client:"Mehta Enterprises",       event:"CORPORATE_CONFERENCE", space:"Grand Ballroom",    date:"2025-06-02", pax:320, amount:245000, status:"CONFIRMED", bde:"sales@grandpalace.in" },
    { ref:"BK-2425-0102", client:"Arjun & Priya Wedding",   event:"WEDDING",              space:"Terrace + Lawn",    date:"2025-06-07", pax:800, amount:850000, status:"TENTATIVE", bde:"bde@grandpalace.in"   },
    { ref:"BK-2425-0103", client:"TechSpark Solutions",      event:"PRODUCT_LAUNCH",       space:"Convention Hall",   date:"2025-06-10", pax:150, amount:120000, status:"INVOICED",  bde:"bde@grandpalace.in"   },
    { ref:"BK-2425-0104", client:"Karnataka Govt. DEPT",    event:"TOWNHALL",             space:"Grand Ballroom",    date:"2025-06-12", pax:400, amount:360000, status:"CONFIRMED", bde:"sales@grandpalace.in" },
    { ref:"BK-2425-0105", client:"Sharma Family Reception",  event:"RECEPTION",            space:"Convention Hall",   date:"2025-06-14", pax:250, amount:195000, status:"TENTATIVE", bde:"bde@grandpalace.in"   },
    { ref:"BK-2425-0106", client:"Infosys Leadership",       event:"CORPORATE_CONFERENCE", space:"Grand Ballroom",    date:"2025-06-18", pax:500, amount:420000, status:"CONFIRMED", bde:"sales@grandpalace.in" },
    { ref:"BK-2425-0107", client:"Patel Wedding Co.",        event:"ENGAGEMENT",           space:"Terrace + Lawn",    date:"2025-06-21", pax:180, amount:95000,  status:"ENQUIRY",   bde:"bde@grandpalace.in"   },
    { ref:"BK-2425-0108", client:"Namma Fintech Conf.",      event:"AWARD_CEREMONY",       space:"Convention Hall",   date:"2025-06-25", pax:300, amount:280000, status:"CONFIRMED", bde:"sales@grandpalace.in" },
  ];

  const bookingIds: Record<string, string> = {};
  for (const b of bookingData) {
    const existing = await prisma.booking.findUnique({ where: { bookingRef: b.ref } });
    if (existing) { bookingIds[b.ref] = existing.id; continue; }
    const eventDate = new Date(b.date);
    const startTime = new Date(b.date + "T10:00:00+05:30");
    const endTime   = new Date(b.date + "T18:00:00+05:30");
    const booking = await prisma.booking.create({
      data: {
        propertyId: property.id,
        clientId: clientIds[b.client],
        bdeId: userIds[b.bde],
        bookingRef: b.ref,
        status: b.status as BookingStatus,
        source: BookingSource.DIRECT,
        eventType: b.event as EventType,
        setupStartTime: new Date(b.date + "T08:00:00+05:30"),
        eventStartTime: startTime,
        eventEndTime: endTime,
        teardownEndTime: new Date(b.date + "T20:00:00+05:30"),
        expectedPax: b.pax,
        quotedAmount: b.amount,
        bookingSpaces: {
          create: {
            spaceId: spaces[b.space] || spaces["Grand Ballroom"],
            startTime,
            endTime,
            baseRate: b.amount,
            finalRate: b.amount,
          },
        },
      },
    });
    bookingIds[b.ref] = booking.id;
  }

  // ── Invoices ──────────────────────────────────────────────────
  const invoiceData = [
    { num:"VOS/2425/0041", booking:"BK-2425-0101", client:"Mehta Enterprises",  taxable:245000, cgst:22050, sgst:22050, total:289100, due:"2025-06-05", status:"SENT",   items:[{desc:"Grand Ballroom — Corporate Event (8 hrs)",sac:"997212",qty:1,rate:200000},{desc:"AV Setup & Support",sac:"998399",qty:1,rate:45000}] },
    { num:"VOS/2425/0040", booking:"BK-2425-0103", client:"TechSpark Solutions", taxable:120000, cgst:10800, sgst:10800, total:141600, due:"2025-05-31", status:"OVERDUE", items:[{desc:"Convention Hall — Product Launch (6 hrs)",sac:"997212",qty:1,rate:120000}] },
    { num:"VOS/2425/0039", booking:"BK-2425-0106", client:"Infosys Leadership",  taxable:420000, cgst:37800, sgst:37800, total:495600, due:"2025-05-28", status:"PAID",   items:[{desc:"Grand Ballroom — Leadership Summit (Full Day)",sac:"997212",qty:1,rate:350000},{desc:"Catering Coordination",sac:"996334",qty:1,rate:70000}] },
  ];

  for (const inv of invoiceData) {
    const existing = await prisma.invoice.findUnique({ where: { invoiceNumber: inv.num } });
    if (existing) continue;
    const invStatus: InvoiceStatus = inv.status === "PAID" ? "PAID" : inv.status === "OVERDUE" ? "OVERDUE" : "SENT";
    await prisma.invoice.create({
      data: {
        legalEntityId: legal.id,
        bookingId: bookingIds[inv.booking],
        clientId: clientIds[inv.client],
        createdById: userIds["finance@grandpalace.in"],
        invoiceNumber: inv.num,
        invoiceDate: new Date("2025-05-20"),
        dueDate: new Date(inv.due),
        status: invStatus,
        supplyType: IntraInterState.INTRA,
        placeOfSupply: "29",
        subtotal: inv.taxable,
        taxableAmount: inv.taxable,
        cgstAmount: inv.cgst,
        sgstAmount: inv.sgst,
        totalAmount: inv.total,
        amountPaid: invStatus === "PAID" ? inv.total : 0,
        amountDue: invStatus === "PAID" ? 0 : inv.total,
        lineItems: {
          create: inv.items.map((it, i) => ({
            description: it.desc,
            sacCode: it.sac,
            quantity: 1,
            unit: "lump sum",
            unitRate: it.rate,
            amount: it.rate,
            taxableAmount: it.rate,
            gstRatePercent: 18,
            cgstRate: 9,
            sgstRate: 9,
            cgstAmount: Math.round(it.rate * 0.09),
            sgstAmount: Math.round(it.rate * 0.09),
            lineTotal: Math.round(it.rate * 1.18),
            displayOrder: i,
          })),
        },
      },
    });
  }

  // ── Staff ─────────────────────────────────────────────────────
  const staffData = [
    { id:"SEC-001", first:"Ravi",    last:"Kumar",   cat:"security",     role:"SECURITY_SUPERVISOR",     shift:"Morning (6am–2pm)",    phone:"9876543210", joining:"2022-03-12", bgv:"CLEARED",       vendor:"SecureVet India",  aadhaar:"XXXX-4521", police:true,  certExp:"2026-01-01", notes:"" },
    { id:"SEC-002", first:"Suresh",  last:"Nair",    cat:"security",     role:"SECURITY_GUARD",          shift:"Morning (6am–2pm)",    phone:"9876543211", joining:"2023-06-05", bgv:"CLEARED",       vendor:"SecureVet India",  aadhaar:"XXXX-7832", police:true,  certExp:"2026-06-01", notes:"" },
    { id:"SEC-003", first:"Mohan",   last:"Das",     cat:"security",     role:"SECURITY_GUARD",          shift:"Afternoon (2pm–10pm)", phone:"9876543212", joining:"2024-01-18", bgv:"IN_PROGRESS",   vendor:"BackgroundFirst",  aadhaar:"XXXX-3390", police:false, certExp:"",          notes:"" },
    { id:"SEC-004", first:"Ajay",    last:"Singh",   cat:"security",     role:"SECURITY_GUARD",          shift:"Night (10pm–6am)",     phone:"9876543213", joining:"2022-08-22", bgv:"CLEARED",       vendor:"SecureVet India",  aadhaar:"XXXX-1203", police:true,  certExp:"2025-08-01", notes:"" },
    { id:"HK-001",  first:"Lakshmi", last:"Ramaiah", cat:"housekeeping", role:"HOUSEKEEPING_SUPERVISOR",  shift:"Morning (6am–2pm)",    phone:"9876500101", joining:"2021-01-10", bgv:"CLEARED",       vendor:"CleanPro Agency",  aadhaar:"XXXX-4521", police:false, certExp:"2026-01-01", notes:"" },
    { id:"HK-002",  first:"Priya",   last:"Menon",   cat:"housekeeping", role:"HOUSEKEEPING_STAFF",       shift:"Morning (6am–2pm)",    phone:"9876500102", joining:"2022-03-15", bgv:"CLEARED",       vendor:"CleanPro Agency",  aadhaar:"XXXX-7832", police:false, certExp:"2026-03-01", notes:"" },
    { id:"HK-003",  first:"Anand",   last:"Kumar",   cat:"housekeeping", role:"HOUSEKEEPING_STAFF",       shift:"Afternoon (2pm–10pm)", phone:"9876500103", joining:"2023-09-20", bgv:"NOT_INITIATED", vendor:"Direct Hire",      aadhaar:"XXXX-3390", police:false, certExp:"",          notes:"" },
    { id:"MNT-001", first:"Vinod",   last:"Sharma",  cat:"maintenance",  role:"EVENT_COORDINATOR",        shift:"Morning (6am–2pm)",    phone:"9887654321", joining:"2020-04-01", bgv:"CLEARED",       vendor:"Direct Hire",      aadhaar:"XXXX-8812", police:false, certExp:"",          notes:"Civil & carpentry" },
    { id:"MNT-002", first:"Ramesh",  last:"Pillai",  cat:"maintenance",  role:"EVENT_COORDINATOR",        shift:"Flexible / On-call",   phone:"9887654322", joining:"2021-08-15", bgv:"CLEARED",       vendor:"Direct Hire",      aadhaar:"XXXX-2211", police:false, certExp:"",          notes:"" },
    { id:"ELC-001", first:"Suresh",  last:"Babu",    cat:"electrical",   role:"EVENT_COORDINATOR",        shift:"Morning (6am–2pm)",    phone:"9898765432", joining:"2019-02-12", bgv:"CLEARED",       vendor:"Direct Hire",      aadhaar:"XXXX-5543", police:false, certExp:"2027-02-01", notes:"Licensed HT/LT electrician" },
    { id:"ELC-002", first:"Kiran",   last:"Raj",     cat:"electrical",   role:"EVENT_COORDINATOR",        shift:"Flexible / On-call",   phone:"9898765433", joining:"2022-06-20", bgv:"NOT_INITIATED", vendor:"Direct Hire",      aadhaar:"XXXX-9981", police:false, certExp:"",          notes:"" },
    { id:"CRT-001", first:"Gopal",   last:"Naidu",   cat:"caretaker",    role:"FRONT_DESK",               shift:"Full Day (8am–6pm)",   phone:"9912345678", joining:"2018-03-05", bgv:"CLEARED",       vendor:"Direct Hire",      aadhaar:"XXXX-1122", police:false, certExp:"",          notes:"Manages keys & access." },
    { id:"AV-001",  first:"Arun",    last:"Tech",    cat:"av",           role:"EVENT_COORDINATOR",        shift:"Flexible / On-call",   phone:"9923456789", joining:"2023-09-10", bgv:"NOT_INITIATED", vendor:"TechSound Pvt.",   aadhaar:"XXXX-3344", police:false, certExp:"",          notes:"Sound, lighting, projection" },
  ];

  for (const s of staffData) {
    const existing = await prisma.propertyStaff.findFirst({ where: { propertyId: property.id, phone: s.phone } });
    if (existing) continue;
    await prisma.propertyStaff.create({
      data: {
        propertyId: property.id,
        firstName: s.first,
        lastName: s.last,
        staffRole: s.role as StaffRole,
        category: s.cat,
        shift: s.shift,
        vendorName: s.vendor === "Direct Hire" ? null : s.vendor,
        phone: s.phone,
        aadhaarRef: s.aadhaar,
        policeVerified: s.police,
        bgCheckStatus: s.bgv as BackgroundCheckStatus,
        bgvAgencyName: s.vendor === "Direct Hire" ? null : s.vendor,
        bgvExpiresAt: s.certExp ? new Date(s.certExp) : null,
        joiningDate: new Date(s.joining),
        notes: s.notes || null,
      },
    });
  }

  // ── Leads ─────────────────────────────────────────────────────
  const leadData = [
    { client:"Ramesh Iyer",       event:"BIRTHDAY",            date:"2025-08-15", budgetMin:80000,   budgetMax:120000,  status:"QUOTE_SENT",     bde:"bde@grandpalace.in"   },
    { client:"Wipro Annual Day",  event:"CORPORATE_CONFERENCE", date:"2025-09-20", budgetMin:500000,  budgetMax:800000,  status:"NEGOTIATION",    bde:"bde@grandpalace.in"   },
    { client:"Priya Nair Wedding",event:"WEDDING",             date:"2025-11-10", budgetMin:1200000, budgetMax:1800000, status:"SITE_VISIT_DONE", bde:"sales@grandpalace.in" },
    { client:"Flipkart Townhall", event:"TOWNHALL",            date:"2025-07-15", budgetMin:200000,  budgetMax:300000,  status:"CONTACTED",      bde:"bde@grandpalace.in"   },
  ];

  for (const l of leadData) {
    const existing = await prisma.lead.findFirst({
      where: { propertyId: property.id, clientId: clientIds[l.client] }
    });
    if (existing) continue;
    await prisma.lead.create({
      data: {
        propertyId: property.id,
        clientId: clientIds[l.client],
        assignedBdeId: userIds[l.bde],
        contactName: l.client,
        eventType: l.event as EventType,
        tentativeDate: new Date(l.date),
        budgetMin: l.budgetMin,
        budgetMax: l.budgetMax,
        status: l.status as LeadStatus,
        source: BookingSource.DIRECT,
      },
    });
  }

  // ── GST Code Master ───────────────────────────────────────────
  const gstCodes = [
    { type:"SAC", code:"997212", desc:"Rental or leasing services involving own or leased non-residential property", rate:18, cgst:9, sgst:9, igst:18 },
    { type:"SAC", code:"996334", desc:"Catering services in exhibition halls, events, cultural programmes etc.", rate:18, cgst:9, sgst:9, igst:18 },
    { type:"SAC", code:"998399", desc:"Other support services n.e.c.", rate:18, cgst:9, sgst:9, igst:18 },
  ];
  for (const g of gstCodes) {
    await prisma.gstCodeMaster.upsert({
      where: { code: g.code },
      update: {},
      create: { codeType: g.type, code: g.code, description: g.desc, gstRate: g.rate, cgstRate: g.cgst, sgstRate: g.sgst, igstRate: g.igst },
    });
  }

  console.log("✅ Seed complete!");
  console.log(`   Org: ${org.id}`);
  console.log(`   Property: ${property.id}`);
  console.log(`   Users: ${Object.keys(userIds).length}`);
  console.log(`   Bookings: ${Object.keys(bookingIds).length}`);
  console.log(`   Staff: ${staffData.length}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
