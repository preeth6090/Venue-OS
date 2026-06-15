"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// ─── localStorage hook ──────────────────────────────────────────
function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const s = localStorage.getItem(key);
      return s ? (JSON.parse(s) as T) : initial;
    } catch { return initial; }
  });
  const set = (v: T | ((p: T) => T)) => {
    setVal(prev => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [val, set];
}

// ─── Venue Config ───────────────────────────────────────────────
interface VenueConfig {
  name: string; tagline: string; description: string;
  addressLine1: string; city: string; state: string; pincode: string;
  phone: string; email: string; website: string; gstin: string;
  logoUrl: string; coverPhotoUrl: string; promoVideoUrl: string;
  gallery: string[];  // up to 12 photo URLs
  facilities: { icon: string; name: string; desc: string; photo: string }[];
  spaces: { name: string; capacity: string; rateFrom: string; desc: string; photo: string }[];
  instagram: string; facebook: string; googleMapsUrl: string;
}
const DEFAULT_VENUE: VenueConfig = {
  name:"Grand Palace Venues",tagline:"Bengaluru's Premier Event Destination",
  description:"Grand Palace Venues offers world-class banquet halls, lush lawns, and state-of-the-art convention spaces nestled in the heart of Bengaluru. With over 20 years of experience hosting weddings, corporate events, and social gatherings, we bring your vision to life.",
  addressLine1:"No. 42, Outer Ring Road, Marathahalli",city:"Bengaluru",state:"Karnataka",pincode:"560037",
  phone:"+91 98765 43210",email:"events@grandpalace.in",website:"https://grandpalace.in",gstin:"29AABCG1234N1Z5",
  logoUrl:"",coverPhotoUrl:"https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1600",
  promoVideoUrl:"",
  gallery:[
    "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
    "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800",
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
    "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800",
    "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800",
    "https://images.unsplash.com/photo-1470753937643-efeb931202a9?w=800",
  ],
  facilities:[
    {icon:"❄️",name:"Central Air Conditioning",desc:"Temperature-controlled halls for all seasons",photo:""},
    {icon:"🅿️",name:"Valet Parking",desc:"Complimentary valet for up to 500 vehicles",photo:""},
    {icon:"🎤",name:"Professional PA System",desc:"High-end Bose & JBL sound throughout",photo:""},
    {icon:"💡",name:"Decorative Lighting",desc:"Programmable LED & chandeliers",photo:""},
    {icon:"🍽️",name:"Catering Kitchen",desc:"Full commercial kitchen on-site",photo:""},
    {icon:"🎥",name:"AV & Projectors",desc:"4K projectors with 16ft screens",photo:""},
    {icon:"📶",name:"High-Speed Wi-Fi",desc:"1 Gbps dedicated event internet",photo:""},
    {icon:"🔒",name:"24/7 Security",desc:"CCTV & licensed security personnel",photo:""},
  ],
  spaces:[
    {name:"Grand Ballroom",capacity:"Up to 800 guests",rateFrom:"₹1,50,000",desc:"Our flagship 12,000 sq.ft. pillarless hall with high ceilings and crystal chandeliers. Perfect for grand weddings and large corporate galas.",photo:"https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800"},
    {name:"Terrace + Lawn",capacity:"Up to 500 guests",rateFrom:"₹80,000",desc:"A lush open-air terrace and garden lawn, ideal for evening functions, cocktail parties, and open-air weddings.",photo:"https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800"},
    {name:"Convention Hall",capacity:"Up to 300 guests",rateFrom:"₹60,000",desc:"A versatile convention space with theatre, classroom, and banquet configurations. Fully equipped with AV for corporate events.",photo:"https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"},
    {name:"Conference Center",capacity:"Up to 100 guests",rateFrom:"₹25,000",desc:"Intimate boardroom and breakout spaces for leadership meetings, training sessions, and product launches.",photo:"https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800"},
  ],
  instagram:"https://instagram.com/grandpalacevenues",
  facebook:"https://facebook.com/grandpalacevenues",
  googleMapsUrl:"https://maps.google.com/?q=Grand+Palace+Venues+Bengaluru",
};

// ═══════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

type StaffCategory = "security"|"housekeeping"|"maintenance"|"electrical"|"caretaker"|"av"|"plumber"|"gardener";

const STAFF_CATEGORIES: { id:StaffCategory; label:string; icon:string; compliance:"STRICT"|"LIGHT" }[] = [
  { id:"security",    label:"Security",     icon:"🛡️", compliance:"STRICT" },
  { id:"housekeeping",label:"Housekeeping", icon:"🧹", compliance:"STRICT" },
  { id:"maintenance", label:"Maintenance",  icon:"🔧", compliance:"LIGHT"  },
  { id:"electrical",  label:"Electrical",   icon:"⚡", compliance:"LIGHT"  },
  { id:"caretaker",   label:"Caretaker",    icon:"🏠", compliance:"LIGHT"  },
  { id:"av",          label:"AV Tech",      icon:"📺", compliance:"LIGHT"  },
  { id:"plumber",     label:"Plumber",      icon:"🔩", compliance:"LIGHT"  },
  { id:"gardener",    label:"Gardener",     icon:"🌿", compliance:"LIGHT"  },
];

const SHIFTS   = ["Morning (6am–2pm)","Afternoon (2pm–10pm)","Night (10pm–6am)","Full Day (8am–6pm)","Flexible / On-call"];
const BGV_LIST = ["CLEARED","IN_PROGRESS","NOT_INITIATED","FLAGGED","EXPIRED"];
const EVENT_TYPES = ["Wedding","Reception","Engagement","Corporate Conference","Product Launch","Birthday","Anniversary","Townhall","Award Ceremony","Cocktail Party","Baby Shower","Other"];

interface Staff {
  id:string; name:string; category:StaffCategory; role:string; shift:string;
  phone:string; joining:string; bgv:string; vendor:string; aadhaar:string;
  police:boolean; cert:string; certExp:string; photo:string; notes:string;
}

const INIT_STAFF: Staff[] = [
  { id:"SEC-001",name:"Ravi Kumar",      category:"security",    role:"Head of Security",       shift:"Morning (6am–2pm)",   phone:"9876543210",joining:"12 Mar 2022",bgv:"CLEARED",     vendor:"SecureVet India", aadhaar:"XXXX-4521",police:true, cert:"SecureVet India",certExp:"Jan 2026",photo:"",notes:""},
  { id:"SEC-002",name:"Suresh Nair",     category:"security",    role:"Security Guard",          shift:"Morning (6am–2pm)",   phone:"9876543211",joining:"05 Jun 2023",bgv:"CLEARED",     vendor:"SecureVet India", aadhaar:"XXXX-7832",police:true, cert:"SecureVet India",certExp:"Jun 2026",photo:"",notes:""},
  { id:"SEC-003",name:"Mohan Das",       category:"security",    role:"Security Guard",          shift:"Afternoon (2pm–10pm)",phone:"9876543212",joining:"18 Jan 2024",bgv:"IN_PROGRESS", vendor:"BackgroundFirst",  aadhaar:"XXXX-3390",police:false,cert:"BackgroundFirst", certExp:"—",       photo:"",notes:""},
  { id:"SEC-004",name:"Ajay Singh",      category:"security",    role:"Night Security",          shift:"Night (10pm–6am)",    phone:"9876543213",joining:"22 Aug 2022",bgv:"CLEARED",     vendor:"SecureVet India", aadhaar:"XXXX-1203",police:true, cert:"SecureVet India",certExp:"Aug 2025",photo:"",notes:""},
  { id:"HK-001", name:"Lakshmi Ramaiah",category:"housekeeping",role:"Housekeeping Supervisor", shift:"Morning (6am–2pm)",   phone:"9876500101",joining:"10 Jan 2021",bgv:"CLEARED",     vendor:"CleanPro Agency",  aadhaar:"XXXX-4521",police:false,cert:"CleanPro",        certExp:"Jan 2026",photo:"",notes:""},
  { id:"HK-002", name:"Priya Menon",    category:"housekeeping",role:"Housekeeping Staff",      shift:"Morning (6am–2pm)",   phone:"9876500102",joining:"15 Mar 2022",bgv:"CLEARED",     vendor:"CleanPro Agency",  aadhaar:"XXXX-7832",police:false,cert:"CleanPro",        certExp:"Mar 2026",photo:"",notes:""},
  { id:"HK-003", name:"Anand Kumar",    category:"housekeeping",role:"Housekeeping Staff",      shift:"Afternoon (2pm–10pm)",phone:"9876500103",joining:"20 Sep 2023",bgv:"NOT_INITIATED",vendor:"Direct Hire",     aadhaar:"XXXX-3390",police:false,cert:"—",               certExp:"—",       photo:"",notes:""},
  { id:"MNT-001",name:"Vinod Sharma",   category:"maintenance", role:"Maintenance Supervisor",  shift:"Morning (6am–2pm)",   phone:"9887654321",joining:"01 Apr 2020",bgv:"CLEARED",     vendor:"Direct Hire",      aadhaar:"XXXX-8812",police:false,cert:"—",               certExp:"—",       photo:"",notes:"Civil & carpentry"},
  { id:"MNT-002",name:"Ramesh Pillai",  category:"maintenance", role:"Maintenance Staff",       shift:"Flexible / On-call",  phone:"9887654322",joining:"15 Aug 2021",bgv:"CLEARED",     vendor:"Direct Hire",      aadhaar:"XXXX-2211",police:false,cert:"—",               certExp:"—",       photo:"",notes:""},
  { id:"ELC-001",name:"Suresh Babu",    category:"electrical",  role:"Senior Electrician",      shift:"Morning (6am–2pm)",   phone:"9898765432",joining:"12 Feb 2019",bgv:"CLEARED",     vendor:"Direct Hire",      aadhaar:"XXXX-5543",police:false,cert:"Electrical Lic.", certExp:"Feb 2027",photo:"",notes:"Licensed HT/LT electrician"},
  { id:"ELC-002",name:"Kiran Raj",      category:"electrical",  role:"Electrician",             shift:"Flexible / On-call",  phone:"9898765433",joining:"20 Jun 2022",bgv:"NOT_INITIATED",vendor:"Direct Hire",     aadhaar:"XXXX-9981",police:false,cert:"—",               certExp:"—",       photo:"",notes:""},
  { id:"CRT-001",name:"Gopal Naidu",    category:"caretaker",   role:"Property Caretaker",      shift:"Full Day (8am–6pm)",  phone:"9912345678",joining:"05 Mar 2018",bgv:"CLEARED",     vendor:"Direct Hire",      aadhaar:"XXXX-1122",police:false,cert:"—",               certExp:"—",       photo:"",notes:"Longest serving. Manages keys & access."},
  { id:"AV-001", name:"Arun Tech",      category:"av",          role:"AV Technician",           shift:"Flexible / On-call",  phone:"9923456789",joining:"10 Sep 2023",bgv:"NOT_INITIATED",vendor:"TechSound Pvt.",  aadhaar:"XXXX-3344",police:false,cert:"—",               certExp:"—",       photo:"",notes:"Sound, lighting, projection"},
];

const BOOKINGS = [
  { ref:"BK-2425-0101",client:"Mehta Enterprises",        event:"Corporate Conference",space:"Grand Ballroom",   date:"02 Jun 2025",day:2, pax:320,amount:"₹2,45,000",status:"CONFIRMED"},
  { ref:"BK-2425-0102",client:"Arjun & Priya Wedding",    event:"Wedding",             space:"Terrace + Lawn",  date:"07 Jun 2025",day:7, pax:800,amount:"₹8,50,000",status:"TENTATIVE"},
  { ref:"BK-2425-0103",client:"TechSpark Solutions",       event:"Product Launch",      space:"Convention Hall", date:"10 Jun 2025",day:10,pax:150,amount:"₹1,20,000",status:"INVOICED"},
  { ref:"BK-2425-0104",client:"Karnataka Govt. DEPT",     event:"Townhall",            space:"Conference Ctr",  date:"12 Jun 2025",day:12,pax:400,amount:"₹3,60,000",status:"CONFIRMED"},
  { ref:"BK-2425-0105",client:"Sharma Family Reception",  event:"Reception",           space:"Rooftop Venue",   date:"14 Jun 2025",day:14,pax:250,amount:"₹1,95,000",status:"TENTATIVE"},
  { ref:"BK-2425-0106",client:"Infosys Leadership Summit",event:"Corporate Conference",space:"Grand Ballroom",  date:"18 Jun 2025",day:18,pax:500,amount:"₹4,20,000",status:"CONFIRMED"},
  { ref:"BK-2425-0107",client:"Patel Wedding Co.",        event:"Engagement",          space:"Lawn",            date:"21 Jun 2025",day:21,pax:180,amount:"₹95,000",  status:"ENQUIRY"},
  { ref:"BK-2425-0108",client:"Namma Fintech Conf.",      event:"Award Ceremony",      space:"Convention Hall", date:"25 Jun 2025",day:25,pax:300,amount:"₹2,80,000",status:"CONFIRMED"},
];
const BOOKED_DAYS   = new Set(BOOKINGS.map(b=>b.day));
const EXTERNAL_DAYS = new Set([5,6,11,13,15,16,20,22,27,28,29,30]);
const STATUS_COLOR: Record<string,string> = {
  CONFIRMED:"#10b981",TENTATIVE:"#f59e0b",ENQUIRY:"#a855f7",
  INVOICED:"#3b82f6", CANCELLED:"#ef4444",COMPLETED:"#64748b",
};

const AIRBNB_BOOKINGS = [
  { id:"ABB-001",guest:"Sarah Johnson",  property:"Skyview Suite",checkin:"05 Jun",checkout:"07 Jun",nights:2,amount:"₹12,500",status:"CONFIRMED",source:"Airbnb",  blocked:true},
  { id:"ABB-002",guest:"Rajesh Mehta",   property:"Skyview Suite",checkin:"11 Jun",checkout:"13 Jun",nights:3,amount:"₹22,000",status:"CONFIRMED",source:"Google",  blocked:true},
  { id:"ABB-003",guest:"Amit Shah",      property:"Garden Villa", checkin:"20 Jun",checkout:"22 Jun",nights:2,amount:"₹15,000",status:"TENTATIVE",source:"Airbnb",  blocked:true},
  { id:"ABB-004",guest:"Priya Sharma",   property:"Skyview Suite",checkin:"27 Jun",checkout:"30 Jun",nights:3,amount:"₹18,000",status:"CONFIRMED",source:"Airbnb",  blocked:true},
  { id:"ABB-005",guest:"[MAINTENANCE]",  property:"Garden Villa", checkin:"15 Jun",checkout:"16 Jun",nights:1,amount:"—",      status:"BLOCKED",  source:"Internal",blocked:true},
];

const EXP_CATS = [
  {name:"Electricity & Utilities",icon:"⚡",amount:45000, color:"#f59e0b"},
  {name:"Property Rent",          icon:"🏢",amount:120000,color:"#3b82f6"},
  {name:"Security Staff",         icon:"🛡️",amount:38000, color:"#ef4444"},
  {name:"Housekeeping & Cleaning",icon:"🧹",amount:25000, color:"#10b981"},
  {name:"Catering Setup",         icon:"🍽️",amount:15000, color:"#a855f7"},
  {name:"AV & Technology",        icon:"📺",amount:12000, color:"#06b6d4"},
  {name:"Maintenance & Repairs",  icon:"🔧",amount:8000,  color:"#f97316"},
  {name:"Miscellaneous",          icon:"📦",amount:10000, color:"#64748b"},
];
const EXP_MONTHLY = [
  {month:"Jan",electricity:42000,rent:120000,security:36000,housekeeping:23000,catering:12000,av:9000, maintenance:6000, misc:8000 },
  {month:"Feb",electricity:38000,rent:120000,security:36000,housekeeping:22000,catering:14000,av:11000,maintenance:7000, misc:9000 },
  {month:"Mar",electricity:41000,rent:120000,security:37000,housekeeping:24000,catering:18000,av:15000,maintenance:12000,misc:11000},
  {month:"Apr",electricity:44000,rent:120000,security:38000,housekeeping:25000,catering:15000,av:12000,maintenance:8000, misc:10000},
  {month:"May",electricity:47000,rent:120000,security:38000,housekeeping:26000,catering:16000,av:13000,maintenance:9000, misc:12000},
  {month:"Jun",electricity:45000,rent:120000,security:38000,housekeeping:25000,catering:15000,av:12000,maintenance:8000, misc:10000},
];
const EXP_KEYS = ["electricity","rent","security","housekeeping","catering","av","maintenance","misc"] as const;

const INVOICE_LIST = [
  {num:"VOS/2425/0041",client:"Mehta Enterprises",  taxable:245000,cgst:22050,sgst:22050,total:289100,due:"05 Jun 2025",status:"SENT",   bookingRef:"BK-2425-0101",items:[{desc:"Grand Ballroom — Corporate Event (8 hrs)",sac:"997212",qty:1,rate:200000},{desc:"AV Setup & Support",sac:"998399",qty:1,rate:45000}]},
  {num:"VOS/2425/0040",client:"TechSpark Solutions", taxable:120000,cgst:10800,sgst:10800,total:141600,due:"31 May 2025",status:"OVERDUE",bookingRef:"BK-2425-0103",items:[{desc:"Convention Hall — Product Launch (6 hrs)",sac:"997212",qty:1,rate:120000}]},
  {num:"VOS/2425/0039",client:"Infosys Leadership",  taxable:420000,cgst:37800,sgst:37800,total:495600,due:"28 May 2025",status:"PAID",   bookingRef:"BK-2425-0106",items:[{desc:"Grand Ballroom — Leadership Summit (Full Day)",sac:"997212",qty:1,rate:350000},{desc:"Catering Coordination",sac:"996334",qty:1,rate:70000}]},
];

const BDE_INIT = [
  {name:"Sneha Reddy",role:"Senior BDE",        bookings:14,revenue:920000, commission:18400,target:1200000,rate:2.0},
  {name:"Karan Mehta",role:"Business Dev. Exec.",bookings:12,revenue:780000, commission:15600,target:1200000,rate:2.0},
  {name:"Divya Nair", role:"Business Dev. Exec.",bookings:8, revenue:450000, commission:9000, target:1000000,rate:2.0},
];

const KPI = [
  {label:"Revenue (MTD)",     value:"₹18,42,500",delta:"+12.4% vs last month",up:true },
  {label:"Confirmed Bookings",value:"34",         delta:"8 this week",          up:true },
  {label:"Avg. Event Value",  value:"₹54,191",   delta:"+3.1% vs last month",  up:true },
  {label:"Outstanding Dues",  value:"₹3,15,000", delta:"6 invoices overdue",   up:false},
];
const REV=[42,68,55,72,88,95,76,110,98,125,142,138];
const MON=["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
const CLIENTS=["Mehta Enterprises","Arjun & Priya Wedding","TechSpark Solutions","Karnataka Govt.","Sharma Family","Infosys Leadership","Namma Fintech","Wipro Ltd","Flipkart Events","New Client"];
const PIPELINE=[{stage:"New",count:12,color:"#64748b"},{stage:"Contacted",count:9,color:"#a855f7"},{stage:"Site Visit",count:6,color:"#3b82f6"},{stage:"Quote Sent",count:8,color:"#f59e0b"},{stage:"Negotiation",count:5,color:"#f97316"},{stage:"Converted",count:34,color:"#10b981"}];
const LEADS=[
  {name:"Ramesh Iyer",       event:"Birthday Party",      date:"Aug 2025",budget:"₹80K–₹1.2L",status:"QUOTE_SENT",    bde:"Sneha R."},
  {name:"Wipro Annual Day",  event:"Corporate Conference",date:"Sep 2025",budget:"₹5L–₹8L",   status:"NEGOTIATION",   bde:"Karan M."},
  {name:"Priya Nair Wedding",event:"Wedding",             date:"Nov 2025",budget:"₹12L–₹18L", status:"SITE_VISIT_DONE",bde:"Sneha R."},
  {name:"Flipkart Townhall", event:"Townhall",            date:"Jul 2025",budget:"₹2L–₹3L",   status:"CONTACTED",     bde:"Karan M."},
];
const DEFAULT_PREFIX = {prefix:"VOS",separator:"/",yearCode:"2425",suffix:""};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const fmt = (n:number)=>"₹"+n.toLocaleString("en-IN");
const initials = (n:string)=>n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
const avatarBg = (bgv:string)=>bgv==="CLEARED"?"#10b981":bgv==="IN_PROGRESS"?"#f59e0b":bgv==="FLAGGED"?"#ef4444":"#64748b";

function Badge({status}:{status:string}){
  const m:Record<string,string>={CONFIRMED:"badge-confirmed",TENTATIVE:"badge-tentative",CANCELLED:"badge-cancelled",INVOICED:"badge-invoiced",ENQUIRY:"badge-enquiry",COMPLETED:"badge-completed",SENT:"badge-invoiced",OVERDUE:"badge-cancelled",PAID:"badge-confirmed",CLEARED:"badge-confirmed",IN_PROGRESS:"badge-tentative",NOT_INITIATED:"badge-enquiry",FLAGGED:"badge-cancelled",EXPIRED:"badge-cancelled",BLOCKED:"badge-cancelled",QUOTE_SENT:"badge-invoiced",NEGOTIATION:"badge-tentative",SITE_VISIT_DONE:"badge-confirmed",CONTACTED:"badge-enquiry",PENDING:"badge-tentative",APPROVED:"badge-confirmed",REJECTED:"badge-cancelled"};
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${m[status]??"badge-completed"}`}>{status.replace(/_/g," ")}</span>;
}

function Card({children,className="",style,onClick}:{children:React.ReactNode;className?:string;style?:React.CSSProperties;onClick?:()=>void}){
  return <div className={`v-card ${className}`} style={style} onClick={onClick}>{children}</div>;
}

function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}){
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.75)"}} onClick={onClose}>
      <div className={`v-card ${wide?"w-full max-w-4xl":"w-full max-w-xl"} max-h-[92vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 v-card rounded-t-xl" style={{borderBottom:"1px solid var(--border)"}}>
          <h2 className="font-bold text-lg v-text">{title}</h2>
          <button onClick={onClose} className="v-muted hover:v-text text-xl transition-colors leading-none" style={{color:"var(--muted)"}}>✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function FL({label,children}:{label:string;children:React.ReactNode}){
  return <div><label className="text-xs uppercase tracking-wider mb-1 block" style={{color:"var(--muted)"}}>{label}</label>{children}</div>;
}
function VI({value,onChange,placeholder=""}:{value:string;onChange:(v:string)=>void;placeholder?:string}){
  return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="v-input"/>;
}
function VS({value,onChange,options}:{value:string;onChange:(v:string)=>void;options:string[]}){
  return <select value={value} onChange={e=>onChange(e.target.value)} className="v-input">{options.map(o=><option key={o} value={o}>{o}</option>)}</select>;
}

function Th({c}:{c:string}){return <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap" style={{color:"var(--muted)"}}>{c}</th>;}
function THead({cols}:{cols:string[]}){return <thead><tr style={{borderBottom:"1px solid var(--border)"}}>{cols.map(c=><Th key={c} c={c}/>)}</tr></thead>;}
function Td({children,className="",style}:{children:React.ReactNode;className?:string;style?:React.CSSProperties}){return <td className={`px-4 py-3 text-sm ${className}`} style={style}>{children}</td>;}
function Row({children,onClick,hi=false}:{children:React.ReactNode;onClick?:()=>void;hi?:boolean}){
  return <tr onClick={onClick} className={`transition-colors last:border-0 ${onClick?"cursor-pointer":""}`} style={{borderBottom:"1px solid var(--s2)",background:hi?"rgba(245,158,11,0.05)":"transparent"}}
    onMouseEnter={e=>{if(onClick)(e.currentTarget as HTMLTableRowElement).style.background="var(--s2)";}}
    onMouseLeave={e=>{(e.currentTarget as HTMLTableRowElement).style.background=hi?"rgba(245,158,11,0.05)":"transparent";}}>
    {children}
  </tr>;
}

function Section({title,sub,btn,onBtn,children}:{title:string;sub?:string;btn?:string;onBtn?:()=>void;children:React.ReactNode}){
  return <div className="space-y-4 animate-slide-in">
    <div className="flex items-start justify-between">
      <div><h1 className="text-2xl font-bold" style={{color:"var(--text)"}}>{title}</h1>{sub&&<p className="text-sm mt-1" style={{color:"var(--muted)"}}>{sub}</p>}</div>
      {btn&&<button onClick={onBtn} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-colors">{btn}</button>}
    </div>
    {children}
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// STAFF AVATAR  (photo with working error fallback)
// ═══════════════════════════════════════════════════════════════

function StaffAvatar({staff,size=10}:{staff:Staff;size?:number}){
  const [imgErr,setImgErr]=useState(false);
  const bg=avatarBg(staff.bgv);
  const px=size*4; // tailwind w-10 = 40px
  const fs=size<=8?11:14;
  if(staff.photo&&!imgErr){
    return <div className="rounded-full overflow-hidden flex-shrink-0" style={{width:px,height:px,border:`2px solid ${bg}`}}>
      <img src={staff.photo} alt={staff.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={()=>setImgErr(true)}/>
    </div>;
  }
  return <div className="rounded-full flex items-center justify-center font-bold text-black flex-shrink-0" style={{width:px,height:px,background:bg,fontSize:fs}}>{initials(staff.name)}</div>;
}

// ═══════════════════════════════════════════════════════════════
// STAFF MODAL (add / edit)
// ═══════════════════════════════════════════════════════════════

function StaffModal({initial,onClose,onSave}:{initial?:Staff;onClose:()=>void;onSave:(s:Staff)=>void}){
  const blank:Staff={id:"",name:"",category:"security",role:"",shift:SHIFTS[0],phone:"",joining:"",bgv:"NOT_INITIATED",vendor:"Direct Hire",aadhaar:"",police:false,cert:"",certExp:"",photo:"",notes:""};
  const [f,setF]=useState<Staff>(initial??blank);
  const [imgErr,setImgErr]=useState(false);
  const upd=(k:keyof Staff,v:string|boolean)=>setF(p=>({...p,[k]:v}));
  const cat=STAFF_CATEGORIES.find(c=>c.id===f.category);
  const isStrict=cat?.compliance==="STRICT";
  const newId=()=>`${f.category.slice(0,3).toUpperCase()}-${String(Math.floor(Math.random()*900)+100)}`;
  const save=()=>{onSave({...f,id:f.id||newId()});onClose();};

  return(
    <Modal title={initial?"Edit Staff Member":"Add New Staff Member"} onClose={onClose} wide>
      <div className="space-y-5">
        {/* Photo + basic */}
        <div className="flex gap-4 items-start">
          <div className="text-center flex-shrink-0">
            {f.photo&&!imgErr
              ? <img src={f.photo} className="w-20 h-20 rounded-full object-cover" style={{border:`2px solid ${avatarBg(f.bgv)}`}} onError={()=>setImgErr(true)}/>
              : <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-black" style={{background:avatarBg(f.bgv)}}>{initials(f.name||"?")}</div>
            }
            <p className="text-xs mt-1" style={{color:"var(--subtle)"}}>Preview</p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            <FL label="Full Name"><VI value={f.name} onChange={v=>upd("name",v)} placeholder="e.g. Ravi Kumar"/></FL>
            <FL label="Photo URL (optional)"><VI value={f.photo} onChange={v=>{upd("photo",v);setImgErr(false);}} placeholder="https://...jpg"/></FL>
            <FL label="Staff Category">
              <select value={f.category} onChange={e=>upd("category",e.target.value as StaffCategory)} className="v-input">
                {STAFF_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </FL>
            <FL label="Role / Designation"><VI value={f.role} onChange={v=>upd("role",v)} placeholder="e.g. Security Guard"/></FL>
          </div>
        </div>
        <hr className="v-divider"/>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Phone Number"><VI value={f.phone} onChange={v=>upd("phone",v.replace(/\D/g,"").slice(0,10))} placeholder="9876543210"/></FL>
          <FL label="Joining Date"><VI value={f.joining} onChange={v=>upd("joining",v)} placeholder="01 Jan 2024"/></FL>
          <FL label="Shift"><VS value={f.shift} onChange={v=>upd("shift",v)} options={SHIFTS}/></FL>
          <FL label="Aadhaar (last 4 only)"><VI value={f.aadhaar} onChange={v=>upd("aadhaar",v)} placeholder="XXXX-4521"/></FL>
          <FL label="Vendor / Agency"><VI value={f.vendor} onChange={v=>upd("vendor",v)} placeholder="Direct Hire or Agency"/></FL>
          <FL label="Notes (optional)"><VI value={f.notes} onChange={v=>upd("notes",v)} placeholder="Any notes..."/></FL>
        </div>
        <hr className="v-divider"/>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm font-semibold" style={{color:"var(--text)"}}>Background Verification</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isStrict?"badge-cancelled":"badge-completed"}`}>{isStrict?"STRICT":"LIGHT"} Compliance</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FL label="BGV Status"><VS value={f.bgv} onChange={v=>upd("bgv",v)} options={BGV_LIST}/></FL>
            {isStrict&&<><FL label="BGV Agency / Cert"><VI value={f.cert} onChange={v=>upd("cert",v)} placeholder="SecureVet India"/></FL>
            <FL label="Certificate Expiry"><VI value={f.certExp} onChange={v=>upd("certExp",v)} placeholder="Jan 2026"/></FL></>}
          </div>
          {isStrict&&<label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input type="checkbox" checked={f.police} onChange={e=>upd("police",e.target.checked)} className="accent-amber-500 w-4 h-4"/>
            <span className="text-sm" style={{color:"var(--text)"}}>Police NOC / Verification obtained</span>
          </label>}
        </div>
        <button onClick={save} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors">
          {initial?"💾 Save Changes":"➕ Add Staff Member"}
        </button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// CREATE INVOICE MODAL  (with editable invoice number + prefix config)
// ═══════════════════════════════════════════════════════════════

function InvoiceCreateModal({onClose,onSave,pfx}:{onClose:()=>void;onSave:(inv:typeof INVOICE_LIST[0])=>void;pfx:typeof DEFAULT_PREFIX}){
  const [client,setClient]=useState(CLIENTS[0]);
  const [ref,setRef]=useState("BK-2425-0109");
  const [due,setDue]=useState("30 Jun 2025");
  const [items,setItems]=useState([{desc:"Grand Ballroom — Event (6 hrs)",sac:"997212",qty:1,rate:0}]);
  const [saved,setSaved]=useState(false);
  const autoNum=`${pfx.prefix}${pfx.separator}${pfx.yearCode}${pfx.separator}${String(45+INVOICE_LIST.length).padStart(4,"0")}${pfx.suffix}`;
  const [num,setNum]=useState(autoNum);
  const [edited,setEdited]=useState(false);
  const taxable=items.reduce((s,i)=>s+(i.qty*i.rate),0);
  const cgst=Math.round(taxable*.09),sgst=Math.round(taxable*.09),total=taxable+cgst+sgst;
  const addLine=()=>setItems(p=>[...p,{desc:"",sac:"997212",qty:1,rate:0}]);
  const upd=(i:number,k:string,v:string|number)=>setItems(p=>p.map((x,j)=>j===i?{...x,[k]:v}:x));
  const submit=()=>{onSave({num,client,taxable,cgst,sgst,total,due,status:"SENT",bookingRef:ref,items});setSaved(true);setTimeout(onClose,1800);};

  if(saved)return <Modal title="Invoice Created" onClose={onClose}><div className="text-center py-8"><p className="text-5xl mb-3">✅</p><p className="font-bold text-lg" style={{color:"var(--text)"}}>Invoice created!</p><p className="font-mono mt-1" style={{color:"#f59e0b"}}>{num}</p><p className="text-sm mt-1" style={{color:"var(--muted)"}}>{fmt(total)}</p></div></Modal>;

  return(
    <Modal title="Create New Invoice" onClose={onClose} wide>
      <div className="space-y-4">
        {/* Invoice number */}
        <div className="rounded-lg p-3 flex items-center gap-3" style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)"}}>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider mb-1" style={{color:"var(--muted)"}}>Invoice Number {edited&&<span style={{color:"#f59e0b"}}>(manually edited)</span>}</p>
            {edited
              ? <input value={num} onChange={e=>setNum(e.target.value)} className="v-input font-mono" style={{borderColor:"rgba(245,158,11,0.5)"}}/>
              : <p className="font-mono font-bold text-lg" style={{color:"#f59e0b"}}>{num}</p>
            }
          </div>
          <button onClick={()=>{setEdited(p=>!p);if(edited)setNum(autoNum);}} className="px-3 py-1.5 text-xs rounded-lg transition-colors" style={{background:"var(--s2)",border:"1px solid var(--border)",color:"var(--text)"}}>
            {edited?"↺ Reset":"✏️ Edit"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Client"><VS value={client} onChange={setClient} options={CLIENTS}/></FL>
          <FL label="Booking Ref"><VI value={ref} onChange={setRef}/></FL>
          <FL label="Place of Supply"><input readOnly value="Karnataka (29) — Intra-State" className="v-input" style={{color:"#f59e0b"}}/></FL>
          <FL label="Due Date"><VI value={due} onChange={setDue}/></FL>
        </div>
        <div>
          <div className="flex justify-between mb-2"><p className="text-xs uppercase tracking-wider" style={{color:"var(--muted)"}}>Line Items</p><button onClick={addLine} className="text-xs" style={{color:"#f59e0b"}}>+ Add line</button></div>
          {items.map((it,i)=>(
            <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
              <input value={it.desc} onChange={e=>upd(i,"desc",e.target.value)} placeholder="Description" className="v-input col-span-5 text-xs"/>
              <input value={it.sac} onChange={e=>upd(i,"sac",e.target.value)} placeholder="SAC" className="v-input col-span-2 text-xs"/>
              <input value={it.qty} onChange={e=>upd(i,"qty",Number(e.target.value))} type="number" min="1" className="v-input col-span-1 text-xs"/>
              <input value={it.rate||""} onChange={e=>upd(i,"rate",Number(e.target.value))} type="number" placeholder="₹ Rate" className="v-input col-span-3 text-xs"/>
              {items.length>1&&<button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))} className="col-span-1 text-red-400 text-sm">✕</button>}
            </div>
          ))}
        </div>
        <div className="rounded-lg p-4 text-sm space-y-1.5" style={{background:"var(--s2)",border:"1px solid var(--border)"}}>
          <div className="flex justify-between" style={{color:"var(--muted)"}}><span>Taxable</span><span style={{color:"var(--text)",fontWeight:500}}>{fmt(taxable)}</span></div>
          <div className="flex justify-between" style={{color:"var(--muted)"}}><span>CGST 9%</span><span style={{color:"#f59e0b"}}>{fmt(cgst)}</span></div>
          <div className="flex justify-between" style={{color:"var(--muted)"}}><span>SGST 9%</span><span style={{color:"#f59e0b"}}>{fmt(sgst)}</span></div>
          <div className="flex justify-between font-bold text-base" style={{color:"var(--text)",borderTop:"1px solid var(--border)",paddingTop:"0.5rem",marginTop:"0.25rem"}}><span>Total</span><span>{fmt(total)}</span></div>
        </div>
        <button onClick={submit} disabled={total===0||!num} className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold rounded-lg transition-colors">Create Invoice — {fmt(total)}</button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// INVOICE PDF MODAL
// ═══════════════════════════════════════════════════════════════

function printInvoice(inv:any){
  const fmtN=(n:number)=>n.toLocaleString("en-IN");
  const rows=inv.items.map((it:any,i:number)=>{const a=it.qty*it.rate,c=Math.round(a*.09),s=Math.round(a*.09);return`<tr style="background:${i%2?"#f9fafb":"#fff"}"><td>${i+1}</td><td>${it.desc}</td><td style="font-family:monospace">${it.sac}</td><td style="text-align:center">${it.qty}</td><td>₹${fmtN(it.rate)}</td><td>₹${fmtN(a)}</td><td style="color:#d97706">₹${fmtN(c)}</td><td style="color:#d97706">₹${fmtN(s)}</td><td><strong>₹${fmtN(a+c+s)}</strong></td></tr>`;}).join("");
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${inv.num}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;color:#111;padding:40px;max-width:900px;margin:auto}.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}.logo{width:48px;height:48px;background:#f59e0b;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#000;margin-bottom:8px}.co{font-size:18px;font-weight:900}.addr{font-size:11px;color:#666;margin-top:3px}.meta{text-align:right}.ttl{font-size:26px;font-weight:900;letter-spacing:1px}.num{font-size:15px;font-weight:700;color:#d97706;margin-top:4px}.mrow{font-size:11px;color:#666;margin-top:2px}.bill{display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#f9fafb;padding:14px 16px;border-radius:8px;margin-bottom:20px;font-size:12px}.bill label{font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;display:block;margin-bottom:3px}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px}thead tr{background:#111;color:#fff}th{text-align:left;padding:7px 10px;font-size:10px}td{padding:7px 10px;color:#374151;border-bottom:1px solid #f3f4f6}.totals{margin-left:auto;width:260px;font-size:12px}.trow{display:flex;justify-content:space-between;padding:3px 0;color:#6b7280}.grand{display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #111;font-size:15px;font-weight:900}.bank{background:#f9fafb;border-radius:8px;padding:10px 14px;font-size:11px;color:#6b7280;margin-top:14px}@media print{body{padding:20px}}</style></head><body><div class="hdr"><div><div class="logo">V</div><div class="co">Grand Palace Venues Pvt. Ltd.</div><div class="addr">No. 42, Outer Ring Road, Marathahalli, Bengaluru — 560037</div><div class="addr">GSTIN: 29AABCG1234N1Z5 · PAN: AABCG1234N</div></div><div class="meta"><div class="ttl">TAX INVOICE</div><div class="num">${inv.num}</div><div class="mrow">Due: ${inv.due}</div><div class="mrow">Status: <strong>${inv.status}</strong></div></div></div><div class="bill"><div><label>Bill To</label><strong>${inv.client}</strong><br><span style="color:#6b7280">Ref: ${inv.bookingRef}</span></div><div><label>GST Details</label>Supply Type: <strong style="color:#d97706">Intra-State</strong><br>Place of Supply: <strong>Karnataka (29)</strong></div></div><table><thead><tr><th>#</th><th>Description</th><th>SAC</th><th>Qty</th><th>Rate</th><th>Taxable</th><th>CGST 9%</th><th>SGST 9%</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div class="trow"><span>Taxable</span><span>₹${fmtN(inv.taxable)}</span></div><div class="trow"><span style="color:#d97706">CGST @ 9%</span><span style="color:#d97706">₹${fmtN(inv.cgst)}</span></div><div class="trow"><span style="color:#d97706">SGST @ 9%</span><span style="color:#d97706">₹${fmtN(inv.sgst)}</span></div><div class="grand"><span>Total Amount</span><span>₹${fmtN(inv.total)}</span></div></div><div class="bank"><strong>Bank:</strong> HDFC Bank · A/C: 50100123456789 · IFSC: HDFC0001234 · Branch: Marathahalli · UPI: grandpalace@hdfcbank</div></body></html>`;
  const w=window.open("","_blank","width=920,height=700");if(!w)return;
  w.document.write(html);w.document.close();w.focus();
  setTimeout(()=>w.print(),350);
}

function InvoicePDFModal({inv,onClose}:{inv:any;onClose:()=>void}){
  const statusCls=inv.status==="PAID"?"bg-green-100 text-green-700":inv.status==="OVERDUE"?"bg-red-100 text-red-700":"bg-blue-100 text-blue-700";
  return(
    <Modal title={`Invoice ${inv.num}`} onClose={onClose} wide>
      <div className="bg-white rounded-xl text-black" style={{fontFamily:"serif"}}>
        {/* Header — stacks on mobile */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 p-4 sm:p-6 pb-4">
          <div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-black text-lg mb-2" style={{background:"#f59e0b"}}>V</div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight">Grand Palace Venues Pvt. Ltd.</h2>
            <p className="text-gray-500 text-xs mt-0.5">No. 42, Outer Ring Road, Bengaluru — 560037</p>
            <p className="text-gray-500 text-xs">GSTIN: 29AABCG1234N1Z5 · PAN: AABCG1234N</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xl sm:text-2xl font-black text-gray-900 tracking-wide">TAX INVOICE</p>
            <p className="font-bold text-base mt-0.5" style={{color:"#d97706"}}>{inv.num}</p>
            <p className="text-gray-500 text-xs mt-0.5">Due: {inv.due}</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded font-semibold mt-1 ${statusCls}`}>{inv.status}</span>
          </div>
        </div>

        {/* Bill + GST */}
        <div className="grid grid-cols-2 gap-3 mx-4 sm:mx-6 p-3 bg-gray-50 rounded-lg mb-4 text-xs">
          <div>
            <p className="font-bold text-gray-400 uppercase mb-1" style={{fontSize:"9px",letterSpacing:"0.08em"}}>Bill To</p>
            <p className="font-bold text-gray-900 text-sm">{inv.client}</p>
            <p className="text-gray-500 mt-0.5">Ref: {inv.bookingRef}</p>
          </div>
          <div>
            <p className="font-bold text-gray-400 uppercase mb-1" style={{fontSize:"9px",letterSpacing:"0.08em"}}>GST Details</p>
            <p className="text-gray-700">Type: <strong className="text-amber-600">Intra-State</strong></p>
            <p className="text-gray-700">State: <strong>Karnataka (29)</strong></p>
          </div>
        </div>

        {/* Items table — scrollable on mobile */}
        <div className="overflow-x-auto mx-4 sm:mx-6 mb-4 rounded-lg" style={{border:"1px solid #e5e7eb"}}>
          <table className="w-full text-xs" style={{minWidth:"480px"}}>
            <thead><tr className="bg-gray-900 text-white">
              {["#","Description","SAC","Qty","Rate","Taxable","CGST 9%","SGST 9%","Total"].map(h=><th key={h} className="text-left px-2 py-2 font-semibold whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {(inv.items??[]).map((it:any,i:number)=>{const a=it.qty*it.rate,c=Math.round(a*.09),sg=Math.round(a*.09);return(
                <tr key={i} style={{background:i%2===0?"#fff":"#f9fafb"}}>
                  <td className="px-2 py-2 text-gray-400">{i+1}</td>
                  <td className="px-2 py-2 font-medium text-gray-900" style={{maxWidth:"140px",wordBreak:"break-word"}}>{it.desc}</td>
                  <td className="px-2 py-2 font-mono text-gray-500 whitespace-nowrap">{it.sac}</td>
                  <td className="px-2 py-2 text-center text-gray-600">{it.qty}</td>
                  <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{fmt(it.rate)}</td>
                  <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{fmt(a)}</td>
                  <td className="px-2 py-2 whitespace-nowrap" style={{color:"#d97706"}}>{fmt(c)}</td>
                  <td className="px-2 py-2 whitespace-nowrap" style={{color:"#d97706"}}>{fmt(sg)}</td>
                  <td className="px-2 py-2 font-bold text-gray-900 whitespace-nowrap">{fmt(a+c+sg)}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mx-4 sm:mx-6 mb-4">
          <div className="ml-auto max-w-xs text-sm space-y-1">
            <div className="flex justify-between text-gray-500"><span>Taxable Amount</span><span>{fmt(inv.taxable)}</span></div>
            <div className="flex justify-between" style={{color:"#d97706"}}><span>CGST 9%</span><span>{fmt(inv.cgst)}</span></div>
            <div className="flex justify-between" style={{color:"#d97706"}}><span>SGST 9%</span><span>{fmt(inv.sgst)}</span></div>
            <div className="flex justify-between font-black text-base text-gray-900 pt-2" style={{borderTop:"2px solid #111"}}><span>Total</span><span>{fmt(inv.total)}</span></div>
          </div>
        </div>

        {/* Bank */}
        <div className="mx-4 sm:mx-6 mb-4 rounded-lg p-3 text-xs text-gray-500 bg-gray-50">
          <strong className="text-gray-700">Bank:</strong> HDFC Bank · A/C: 50100123456789 · IFSC: HDFC0001234 · Branch: Marathahalli
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={()=>printInvoice(inv)} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm">⬇ Download / Print PDF</button>
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors" style={{background:"var(--s2)",border:"1px solid var(--border)",color:"var(--text)"}}>✕ Close</button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARE AVAILABILITY MODAL
// ═══════════════════════════════════════════════════════════════

function ShareModal({onClose}:{onClose:()=>void}){
  const link="http://localhost:3000?view=portal&property=grand-palace&token=avail_abc123";
  const [copied,setCopied]=useState(false);
  const copy=()=>{try{navigator.clipboard.writeText(link).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});}catch{setCopied(true);setTimeout(()=>setCopied(false),2000);}};
  return(
    <Modal title="Share Availability Link" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg p-3 text-sm" style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",color:"#10b981"}}>
          Share this link with clients to view available dates and submit a booking request — no login required.
        </div>
        <FL label="Public Availability Link">
          <div className="flex gap-2 mt-1">
            <code className="flex-1 rounded-lg px-3 py-2.5 text-xs font-mono break-all" style={{background:"var(--s2)",border:"1px solid var(--border)",color:"#f59e0b"}}>{link}</code>
            <button onClick={copy} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg whitespace-nowrap">{copied?"✓ Copied!":"Copy"}</button>
          </div>
        </FL>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[["Valid For","June 2025"],["Property","Grand Palace Venues"],["Spaces","All available spaces"],["Expires","31 Jul 2025"]].map(([k,v])=>(
            <div key={k} className="rounded-lg p-3" style={{background:"var(--s2)",border:"1px solid var(--border)"}}><p style={{color:"var(--subtle)"}}>{k}</p><p className="font-medium mt-0.5" style={{color:"var(--text)"}}>{v}</p></div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOOKING REQUEST MODAL  (with OTP)
// ═══════════════════════════════════════════════════════════════

function BookingModal({date,onClose}:{date:number;onClose:()=>void}){
  const [done,setDone]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [f,setF]=useState({name:"",phone:"",email:"",eventType:EVENT_TYPES[0],pax:"",startTime:"10:00",endTime:"17:00",space:"Grand Ballroom",notes:""});
  const [err,setErr]=useState("");
  const upd=(k:string,v:string)=>setF(p=>({...p,[k]:v}));
  const enqRef=useRef(`ENQ-${String(Date.now()).slice(-6)}`);

  const submit=async()=>{
    if(!f.name||f.phone.length<10){setErr("Please enter your name and a valid 10-digit phone number.");return;}
    setErr("");setSubmitting(true);
    try{
      await fetch("/api/portal/enquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:f.name,phone:f.phone,email:f.email,eventType:f.eventType,pax:f.pax,space:f.space,notes:f.notes})});
      setDone(true);
    }catch{setErr("Something went wrong. Please try again.");}
    finally{setSubmitting(false);}
  };

  if(done)return(
    <Modal title="Booking Request Submitted" onClose={onClose}>
      <div className="text-center py-6">
        <p className="text-5xl mb-3">🎉</p>
        <h3 className="font-bold text-xl mb-2" style={{color:"var(--text)"}}>Request Received!</h3>
        <p className="text-sm mb-4" style={{color:"var(--muted)"}}>Your enquiry has been submitted. Our team will contact you within 2 hours.</p>
        <div className="rounded-xl p-4 text-left text-sm space-y-2 mb-5" style={{background:"var(--s2)",border:"1px solid var(--border)"}}>
          {[["Enquiry Ref",enqRef.current],["Contact",`${f.name} · ${f.phone}`],["Event",`${f.eventType} · ${f.pax} guests`],["Date",`June ${date} · ${f.startTime}–${f.endTime}`],["Status","PENDING"]].map(([k,v])=>(
            <div key={k} className="flex justify-between"><span style={{color:"var(--muted)"}}>{k}</span><span style={{color:"var(--text)",fontWeight:500}}>{k==="Status"?<Badge status="PENDING"/>:v}</span></div>
          ))}
        </div>
        <button onClick={onClose} className="px-6 py-2 bg-amber-500 text-black font-semibold rounded-lg">Done</button>
      </div>
    </Modal>
  );

  return(
    <Modal title={`Book June ${date}, 2025 — Grand Palace Venues`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="rounded-lg p-3 text-xs" style={{background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.3)",color:"#3b82f6"}}>
          Fill in your event details below. Our team will confirm availability and send a quotation within 2 hours.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FL label="Your Full Name"><VI value={f.name} onChange={v=>upd("name",v)} placeholder="e.g. Priya Sharma"/></FL>
          <FL label="Phone Number"><VI value={f.phone} onChange={v=>upd("phone",v.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile"/></FL>
          <FL label="Email Address"><VI value={f.email} onChange={v=>upd("email",v)} placeholder="you@company.com"/></FL>
          <FL label="Type of Event"><VS value={f.eventType} onChange={v=>upd("eventType",v)} options={EVENT_TYPES}/></FL>
          <FL label="Expected Guests"><VI value={f.pax} onChange={v=>upd("pax",v)} placeholder="e.g. 200"/></FL>
          <FL label="Preferred Space"><VS value={f.space} onChange={v=>upd("space",v)} options={["Grand Ballroom","Convention Hall","Terrace + Lawn","Rooftop Venue","Conference Center","Garden Villa","Full Property"]}/></FL>
          <FL label="Start Time"><input type="time" value={f.startTime} onChange={e=>upd("startTime",e.target.value)} className="v-input"/></FL>
          <FL label="End Time"><input type="time" value={f.endTime} onChange={e=>upd("endTime",e.target.value)} className="v-input"/></FL>
        </div>
        <FL label="Special Requirements / Notes">
          <textarea value={f.notes} onChange={e=>upd("notes",e.target.value)} placeholder="Catering, décor, AV, special setup..." rows={3} className="v-input resize-none"/>
        </FL>
        {err&&<p className="text-red-400 text-sm">{err}</p>}
        <button onClick={submit} disabled={!f.name||!f.pax||submitting} className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold rounded-lg transition-colors">
          {submitting?"Submitting...":"Submit Enquiry"}
        </button>
        <p className="text-xs text-center" style={{color:"var(--subtle)"}}>By submitting, you agree to be contacted by our events team.</p>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════

const KPI_META = [
  {icon:"💰",accent:"#f59e0b",glow:"rgba(245,158,11,0.12)"},
  {icon:"📅",accent:"#10b981",glow:"rgba(16,185,129,0.12)"},
  {icon:"📊",accent:"#3b82f6",glow:"rgba(59,130,246,0.12)"},
  {icon:"⚠️",accent:"#ef4444",glow:"rgba(239,68,68,0.12)"},
];

function Dashboard(){
  const nowD = new Date();
  const dashYear = nowD.getFullYear();
  const dashMonth = nowD.getMonth(); // 0-indexed

  const {data:kpiData=[]} = useQuery({queryKey:["kpi"],queryFn:()=>fetch("/api/kpi").then(r=>r.json())});
  const {data:expData={categories:EXP_CATS,monthly:EXP_MONTHLY}} = useQuery({queryKey:["expenses"],queryFn:()=>fetch("/api/expenses").then(r=>r.json())});
  const {data:bookings=[]} = useQuery({queryKey:["bookings"],queryFn:()=>fetch("/api/bookings").then(r=>r.json())});
  const {data:leads=[]} = useQuery({queryKey:["leads"],queryFn:()=>fetch("/api/leads").then(r=>r.json())});
  const {data:calData} = useQuery({queryKey:["calendar",dashYear,dashMonth],queryFn:()=>fetch(`/api/calendar?year=${dashYear}&month=${dashMonth+1}`).then(r=>r.json())});

  const kpi = kpiData.length ? kpiData : KPI;
  const cats = (expData.categories||EXP_CATS) as any[];
  const totalExp = cats.reduce((s:number,c:any)=>s+c.amount,0);
  const maxRev = Math.max(...REV);

  const daysInMonth = new Date(dashYear, dashMonth+1, 0).getDate();
  const bookedCount = calData?.bookedDays?.length ?? 0;
  const freeCount = daysInMonth - bookedCount;
  const occupancyPct = Math.round((bookedCount/daysInMonth)*100);

  const upcoming = (bookings as any[]).filter((b:any)=>["CONFIRMED","TENTATIVE"].includes(b.status)).slice(0,5);
  const hotLeads = (leads as any[]).filter((l:any)=>["NEW","CONTACTED","SITE_VISIT"].includes(l.status)).slice(0,5);
  const mName = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dashMonth];

  return(
    <div className="space-y-4 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight" style={{color:"var(--text)"}}>Dashboard</h1>
          <p className="text-xs mt-0.5" style={{color:"var(--subtle)"}}>Grand Palace Venues · {mName} {dashYear}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full" style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",color:"#10b981"}}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>Live
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpi.map((k:any,i:number)=>{
          const m=KPI_META[i]||KPI_META[0];
          return(
            <div key={k.label} className="kpi-card v-card p-4" style={{borderColor:"var(--border)"}}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] font-medium uppercase tracking-widest" style={{color:"var(--subtle)"}}>{k.label}</span>
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{background:m.glow}}>{m.icon}</div>
              </div>
              <p className="text-xl sm:text-2xl font-black tracking-tight mb-2 leading-none" style={{color:"var(--text)"}}>{k.value}</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:k.up?"#10b981":"#ef4444"}}/>
                <span className="text-[10px] truncate" style={{color:k.up?"#10b981":"#ef4444"}}>{k.delta}</span>
              </div>
              <div className="absolute bottom-0 left-0 w-14 h-px rounded-full" style={{background:`linear-gradient(90deg,${m.accent},transparent)`}}/>
            </div>
          );
        })}
      </div>

      {/* ── Month Availability ── */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{color:"var(--text)"}}>{mName} Availability</p>
          <span className="text-xs font-bold" style={{color:occupancyPct>70?"#ef4444":occupancyPct>40?"#f59e0b":"#10b981"}}>{occupancyPct}% occupancy</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl p-3 text-center" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}>
            <p className="text-2xl font-black" style={{color:"#ef4444"}}>{bookedCount}</p>
            <p className="text-[10px] mt-0.5" style={{color:"var(--muted)"}}>Days Booked</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)"}}>
            <p className="text-2xl font-black" style={{color:"#10b981"}}>{freeCount}</p>
            <p className="text-[10px] mt-0.5" style={{color:"var(--muted)"}}>Days Free</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)"}}>
            <p className="text-2xl font-black" style={{color:"#f59e0b"}}>{daysInMonth}</p>
            <p className="text-[10px] mt-0.5" style={{color:"var(--muted)"}}>Total Days</p>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{background:"var(--s2)"}}>
          <div className="h-full rounded-full transition-all" style={{width:`${occupancyPct}%`,background:occupancyPct>70?"#ef4444":occupancyPct>40?"#f59e0b":"#10b981"}}/>
        </div>
      </Card>

      {/* ── Upcoming Bookings + Hot Leads ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{color:"var(--text)"}}>Upcoming Bookings</p>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{background:"rgba(245,158,11,0.1)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.2)"}}>{upcoming.length}</span>
          </div>
          {upcoming.length===0
            ?<p className="text-sm py-4 text-center" style={{color:"var(--subtle)"}}>No upcoming bookings</p>
            :<div className="space-y-2">
               {upcoming.map((b:any,i:number)=>(
                 <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{background:"var(--s2)"}}>
                   <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-xs text-black" style={{background:"linear-gradient(135deg,#f59e0b,#f97316)"}}>{b.day||"—"}</div>
                   <div className="flex-1 min-w-0">
                     <p className="text-xs font-semibold truncate" style={{color:"var(--text)"}}>{b.client}</p>
                     <p className="text-[10px] truncate" style={{color:"var(--subtle)"}}>{b.event} · {b.space}</p>
                   </div>
                   <div className="text-right flex-shrink-0">
                     <p className="text-xs font-bold" style={{color:"#f59e0b"}}>{b.amount}</p>
                     <Badge status={b.status}/>
                   </div>
                 </div>
               ))}
             </div>
          }
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{color:"var(--text)"}}>Leads to Follow Up</p>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{background:"rgba(59,130,246,0.1)",color:"#3b82f6",border:"1px solid rgba(59,130,246,0.2)"}}>{hotLeads.length}</span>
          </div>
          {hotLeads.length===0
            ?<p className="text-sm py-4 text-center" style={{color:"var(--subtle)"}}>No active leads</p>
            :<div className="space-y-2">
               {hotLeads.map((l:any,i:number)=>(
                 <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{background:"var(--s2)"}}>
                   <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs text-black" style={{background:"linear-gradient(135deg,#3b82f6,#8b5cf6)"}}>{(l.name||"?").charAt(0)}</div>
                   <div className="flex-1 min-w-0">
                     <p className="text-xs font-semibold truncate" style={{color:"var(--text)"}}>{l.name}</p>
                     <p className="text-[10px] truncate" style={{color:"var(--subtle)"}}>{l.event} · {l.date}</p>
                   </div>
                   <div className="text-right flex-shrink-0">
                     <p className="text-xs font-bold" style={{color:"#f59e0b"}}>{l.budget}</p>
                     <Badge status={l.status}/>
                   </div>
                 </div>
               ))}
             </div>
          }
        </Card>
      </div>

      {/* ── Revenue + Expenses ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="v-card p-4 md:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{color:"var(--text)"}}>Revenue Trend</p>
              <p className="text-xs mt-0.5" style={{color:"var(--subtle)"}}>FY 2024–25 · ₹ Lakhs</p>
            </div>
            <p className="text-base font-black" style={{color:"#f59e0b"}}>₹{REV.reduce((a,b)=>a+b,0)}L</p>
          </div>
          <div className="relative">
            {[0.25,0.5,0.75,1].map(p=>(
              <div key={p} className="absolute left-0 right-0" style={{bottom:`${p*96}px`,borderTop:"1px dashed var(--border)",opacity:0.5}}/>
            ))}
            <div className="flex items-end gap-1 h-24 relative">
              {REV.map((v,i)=>{
                const isMax=v===maxRev;
                return(
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full" style={{height:`${(v/maxRev)*88}px`}}>
                      {isMax&&<div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-bold" style={{color:"#f59e0b"}}>peak</div>}
                      <div className="w-full h-full rounded-t-sm" style={{background:isMax?"linear-gradient(180deg,#f97316,#f59e0b)":"linear-gradient(180deg,rgba(245,158,11,0.7),rgba(245,158,11,0.4))"}} title={`₹${v}L`}/>
                    </div>
                    <span className="text-[8px]" style={{color:i===5?"#f59e0b":"var(--subtle)"}}>{MON[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="v-card p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm font-semibold" style={{color:"var(--text)"}}>Monthly Costs</p>
            <p className="text-sm font-black" style={{color:"#f59e0b"}}>{fmt(totalExp)}</p>
          </div>
          <div className="space-y-2.5">
            {cats.slice(0,5).map((c:any)=>(
              <div key={c.name}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs" style={{color:"var(--muted)"}}>{c.icon} {c.name.split(" ")[0]}</span>
                  <span className="text-[10px] font-semibold" style={{color:"var(--text)"}}>₹{(c.amount/1000).toFixed(0)}K</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{background:"var(--s2)"}}>
                  <div className="h-full rounded-full" style={{width:`${(c.amount/totalExp)*100}%`,background:c.color}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];

function CalendarView({onBook}:{onBook:(d:number)=>void}){
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth()); // 0-indexed
  const [sel,setSel]=useState<any|null>(null);
  const [share,setShare]=useState(false);

  const {data:calData}=useQuery({
    queryKey:["calendar",year,month],
    queryFn:()=>fetch(`/api/calendar?year=${year}&month=${month+1}`).then(r=>r.json()),
  });

  const bookedDays:(typeof calData extends undefined?never:{day:number;ref:string;client:string;event:string;status:string}[])=calData?.bookedDays??[];
  const externalDays:number[]=calData?.externalDays??[];

  const bookedSet=new Set(bookedDays.map((b:any)=>b.day));
  const extSet=new Set(externalDays);

  const daysInMonth=new Date(year,month+1,0).getDate();
  const startDow=new Date(year,month,1).getDay();
  const cells=Array.from({length:daysInMonth},(_,i)=>i+1);
  const grid=[...Array(startDow).fill(null),...cells];
  while(grid.length%7!==0)grid.push(null);

  const byDay=new Map<number,any[]>();
  bookedDays.forEach((b:any)=>{if(!byDay.has(b.day))byDay.set(b.day,[]);byDay.get(b.day)!.push(b);});

  const status=(d:number)=>{const b=bookedSet.has(d),e=extSet.has(d);if(b&&e)return"full";if(b)return"booked";if(e)return"ext";return"avail";};
  const dayStyle=(s:string)=>{
    if(s==="full")  return{border:"rgba(239,68,68,0.5)",bg:"rgba(239,68,68,0.07)"};
    if(s==="booked")return{border:"rgba(245,158,11,0.5)",bg:"rgba(245,158,11,0.07)"};
    if(s==="ext")   return{border:"rgba(236,72,153,0.5)",bg:"rgba(236,72,153,0.07)"};
    return{border:"rgba(16,185,129,0.5)",bg:"rgba(16,185,129,0.07)"};
  };

  const prev=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);setSel(null);};
  const next=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);setSel(null);};

  return(
    <Section title="Booking Calendar" sub="Green dates are available · Click a date to request a booking">
      {share&&<ShareModal onClose={()=>setShare(false)}/>}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={prev} className="px-3 py-1.5 rounded-lg text-sm transition-colors" style={{background:"var(--s1)",border:"1px solid var(--border)",color:"var(--text)"}}>‹</button>
          <span className="font-semibold text-sm" style={{color:"var(--text)"}}>{MONTH_NAMES[month]} {year}</span>
          <button onClick={next} className="px-3 py-1.5 rounded-lg text-sm transition-colors" style={{background:"var(--s1)",border:"1px solid var(--border)",color:"var(--text)"}}>›</button>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          {[["🟢","Available"],["🟡","Booked"],["🔴","Full"],["🩷","Ext/Airbnb"]].map(([ic,lb])=>(
            <span key={lb} className="flex items-center gap-1 text-xs" style={{color:"var(--muted)"}}>{ic} {lb}</span>
          ))}
          <button onClick={()=>setShare(true)} className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors" style={{border:"1px solid rgba(245,158,11,0.5)",color:"#f59e0b",background:"rgba(245,158,11,0.05)"}}>
            🔗 Share Link
          </button>
        </div>
      </div>
      <Card className="p-3 sm:p-4">
        <div className="grid grid-cols-7 mb-2">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} className="text-center text-xs font-semibold py-2" style={{color:"var(--subtle)"}}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day,i)=>{
            if(!day)return <div key={i}/>;
            const s=status(day);
            const {border,bg}=dayStyle(s);
            const avail=s==="avail";
            return(
              <div key={i} onClick={()=>avail&&onBook(day)}
                className={`min-h-16 sm:min-h-20 rounded-lg p-1 sm:p-1.5 transition-all ${avail?"cursor-pointer hover:scale-105 hover:shadow-md":""}`}
                style={{border:`1px solid ${border}`,background:bg}}>
                <p className="text-xs font-semibold mb-0.5" style={{color:avail?"#10b981":s==="booked"?"#f59e0b":"#ef4444"}}>{day}</p>
                {avail&&<p className="text-[9px] sm:text-[10px] font-medium hidden sm:block" style={{color:"#10b981"}}>Free</p>}
                {(byDay.get(day)??[]).map((b:any,j:number)=>(
                  <div key={j} onClick={e=>{e.stopPropagation();setSel(b);}} className="text-[9px] px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer font-medium"
                    style={{background:`${STATUS_COLOR[b.status]??STATUS_COLOR.CONFIRMED}22`,color:STATUS_COLOR[b.status]??STATUS_COLOR.CONFIRMED,border:`1px solid ${STATUS_COLOR[b.status]??STATUS_COLOR.CONFIRMED}44`}}>
                    {b.client?.split(" ")[0]}
                  </div>
                ))}
                {extSet.has(day)&&!bookedSet.has(day)&&<div className="text-[9px] px-1 py-0.5 rounded font-medium hidden sm:block" style={{background:"rgba(236,72,153,0.15)",color:"#f472b6",border:"1px solid rgba(236,72,153,0.3)"}}>✈ Ext</div>}
              </div>
            );
          })}
        </div>
      </Card>
      {sel&&(
        <Card className="p-5 animate-slide-in" style={{borderColor:"rgba(245,158,11,0.4)"}}>
          <div className="flex justify-between items-start">
            <div><p className="font-mono text-xs" style={{color:"#f59e0b"}}>{sel.ref}</p><h3 className="font-bold text-lg mt-0.5" style={{color:"var(--text)"}}>{sel.client}</h3><p className="text-sm" style={{color:"var(--muted)"}}>{sel.event}</p></div>
            <Badge status={sel.status}/>
          </div>
          <button onClick={()=>setSel(null)} className="mt-4 text-xs transition-colors" style={{color:"var(--subtle)"}}>✕ Close</button>
        </Card>
      )}
    </Section>
  );
}

// ── New Booking Modal ────────────────────────────────────────────
const SPACES   = ["Grand Ballroom","Convention Hall","Terrace + Lawn","Rooftop Venue","Conference Center","Garden Villa","Lawn"];
const SOURCES  = ["Direct","Website","Referral","Social Media","Aggregator","BDE Outreach"];
const B_STATUS = ["TENTATIVE","CONFIRMED","ENQUIRY"];

function NewBookingModal({onClose,onSave}:{onClose:()=>void;onSave:(b:typeof BOOKINGS[0])=>void}){
  const [f,setF]=useState({client:CLIENTS[0],event:EVENT_TYPES[0],eventName:"",space:SPACES[0],date:"",startTime:"10:00",endTime:"17:00",pax:"",source:SOURCES[0],status:B_STATUS[0],quotedAmount:"",notes:""});
  const [saved,setSaved]=useState(false);
  const upd=(k:string,v:string)=>setF(p=>({...p,[k]:v}));

  const submit=()=>{
    const ref=`BK-2425-${String(100+BOOKINGS.length+1).padStart(4,"0")}`;
    const day=f.date?parseInt(f.date.split(" ")[0]||f.date.split("-")[2]||"0"):0;
    onSave({ref,client:f.client,event:f.event,space:f.space,date:f.date||"TBD",day,pax:parseInt(f.pax)||0,amount:f.quotedAmount?`₹${parseInt(f.quotedAmount).toLocaleString("en-IN")}`:"-",status:f.status});
    setSaved(true); setTimeout(onClose,1600);
  };

  if(saved)return <Modal title="Booking Created" onClose={onClose}><div className="text-center py-8"><p className="text-5xl mb-3">📅</p><p className="font-bold text-lg" style={{color:"var(--text)"}}>Booking created!</p><p className="text-sm mt-1" style={{color:"var(--muted)"}}>{f.client} · {f.date}</p></div></Modal>;

  return(
    <Modal title="New Booking" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FL label="Client Name"><VS value={f.client} onChange={v=>upd("client",v)} options={CLIENTS}/></FL>
          <FL label="Event Type"><VS value={f.event} onChange={v=>upd("event",v)} options={EVENT_TYPES}/></FL>
          <FL label="Event Name (optional)"><VI value={f.eventName} onChange={v=>upd("eventName",v)} placeholder="e.g. Sharma Wedding 2025"/></FL>
          <FL label="Space / Venue"><VS value={f.space} onChange={v=>upd("space",v)} options={SPACES}/></FL>
          <FL label="Event Date"><VI value={f.date} onChange={v=>upd("date",v)} placeholder="e.g. 28 Jun 2025"/></FL>
          <FL label="Start Time"><input type="time" value={f.startTime} onChange={e=>upd("startTime",e.target.value)} className="v-input"/></FL>
          <FL label="End Time"><input type="time" value={f.endTime} onChange={e=>upd("endTime",e.target.value)} className="v-input"/></FL>
          <FL label="Expected Guests"><VI value={f.pax} onChange={v=>upd("pax",v.replace(/\D/g,""))} placeholder="e.g. 250"/></FL>
          <FL label="Booking Source"><VS value={f.source} onChange={v=>upd("source",v)} options={SOURCES}/></FL>
          <FL label="Status"><VS value={f.status} onChange={v=>upd("status",v)} options={B_STATUS}/></FL>
          <FL label="Quoted Amount (₹)"><VI value={f.quotedAmount} onChange={v=>upd("quotedAmount",v.replace(/\D/g,""))} placeholder="e.g. 250000"/></FL>
          <FL label="Notes"><VI value={f.notes} onChange={v=>upd("notes",v)} placeholder="Special requirements..."/></FL>
        </div>
        <button onClick={submit} disabled={!f.client||!f.pax} className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold rounded-lg transition-colors">
          ✅ Create Booking
        </button>
      </div>
    </Modal>
  );
}

function BookingsView(){
  const qc=useQueryClient();
  const {data:list=[],isLoading}=useQuery({queryKey:["bookings"],queryFn:()=>fetch("/api/bookings").then(r=>r.json())});
  const [modal,setModal]=useState(false);
  const handleSave=async(b:any)=>{
    const res=await fetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});
    if(res.ok){await qc.invalidateQueries({queryKey:["bookings"]});}
  };
  if(isLoading)return <div className="text-center py-10" style={{color:"var(--muted)"}}>Loading bookings...</div>;
  return(
    <Section title="Bookings" sub={`${list.length} events`} btn="+ New Booking" onBtn={()=>setModal(true)}>
      {modal&&<NewBookingModal onClose={()=>setModal(false)} onSave={b=>{handleSave(b);setModal(false);}}/>}
      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {list.map((b,i)=>(
          <Card key={i} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div><p className="font-mono text-xs mb-0.5" style={{color:"#f59e0b"}}>{b.ref}</p><p className="font-semibold text-sm" style={{color:"var(--text)"}}>{b.client}</p></div>
              <Badge status={b.status}/>
            </div>
            <p className="text-xs mb-2" style={{color:"var(--muted)"}}>{b.event} · {b.space}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{color:"var(--muted)"}}>{b.date} · {b.pax} pax</span>
              <span className="text-sm font-bold" style={{color:"var(--text)"}}>{b.amount}</span>
            </div>
          </Card>
        ))}
        {!list.length&&<p className="text-center py-6 text-sm" style={{color:"var(--muted)"}}>No bookings yet</p>}
      </div>
      {/* Desktop table */}
      <Card className="overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
        <table className="w-full"><THead cols={["Ref","Client","Event","Space","Date","Pax","Amount","Status"]}/>
          <tbody>{list.map((b,i)=>(
            <Row key={i}><Td className="font-mono text-xs" style={{color:"#f59e0b"} as React.CSSProperties}>{b.ref}</Td><Td style={{color:"var(--text)",fontWeight:500} as React.CSSProperties}>{b.client}</Td><Td style={{color:"var(--muted)"} as React.CSSProperties}>{b.event}</Td><Td style={{color:"var(--muted)"} as React.CSSProperties}>{b.space}</Td><Td style={{color:"var(--muted)"} as React.CSSProperties}>{b.date}</Td><Td style={{color:"var(--muted)"} as React.CSSProperties}>{b.pax}</Td><Td style={{color:"var(--text)",fontWeight:600} as React.CSSProperties}>{b.amount}</Td><Td><Badge status={b.status}/></Td></Row>
          ))}</tbody>
        </table>
        </div>
      </Card>
    </Section>
  );
}

function ExternalView(){
  const qc=useQueryClient();
  const {data:syncs=[],refetch:refetchSyncs}=useQuery({queryKey:["external-syncs"],queryFn:()=>fetch("/api/external").then(r=>r.json()),refetchInterval:30*60*1000});
  // Auto-sync all connected calendars every 30 min while app is open
  useEffect(()=>{
    if(!syncs.length)return;
    const run=async()=>{
      for(const s of syncs as any[]){
        if(s.icalUrl&&s.icalUrl!=="file-upload"){
          fetch("/api/external",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({icalUrl:s.icalUrl,calendarName:s.calendarName,syncId:s.id})}).catch(()=>{});
        }
      }
    };
    const id=setInterval(run,30*60*1000);
    return()=>clearInterval(id);
  },[syncs]);
  const [importOpen,setImportOpen]=useState(false);
  const [exportOpen,setExportOpen]=useState(false);
  const [url,setUrl]=useState("");
  const [name,setName]=useState("");
  const [adding,setAdding]=useState(false);
  const [syncing,setSyncing]=useState<string|null>(null);
  const [importMsg,setImportMsg]=useState<{text:string;ok:boolean}|null>(null);
  const [showFileUpload,setShowFileUpload]=useState(false);
  const [exportCopied,setExportCopied]=useState(false);
  const [progress,setProgress]=useState(0);
  const [progressStep,setProgressStep]=useState("");
  const exportUrl=typeof window!=="undefined"?`${window.location.origin}/api/webhooks/ical?token=venueos-ical`:"";

  const STEPS=[
    {pct:12,msg:"Connecting to Airbnb..."},
    {pct:28,msg:"Fetching calendar feed..."},
    {pct:48,msg:"Airbnb blocked direct fetch — trying proxy 1..."},
    {pct:66,msg:"Proxy 1 working — downloading events..."},
    {pct:82,msg:"Parsing iCal events..."},
    {pct:93,msg:"Saving to database..."},
  ];

  const runWithProgress=async(payload:object)=>{
    setProgress(0); setProgressStep("Starting...");
    let step=0;
    const timer=setInterval(()=>{
      if(step<STEPS.length){setProgress(STEPS[step].pct);setProgressStep(STEPS[step].msg);step++;}
    },1800);
    let data:any={}, ok=false;
    try{
      const res=await fetch("/api/external",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const text=await res.text();
      try{ data=JSON.parse(text); }catch{ data={error:`Server error (${res.status}) — the request timed out. Try again.`}; }
      ok=res.ok;
    }catch(e){ data={error:"Could not reach server. Check your internet connection and try again."}; }
    clearInterval(timer);
    if(ok){
      setProgress(100); setProgressStep(`Done! ${data.eventsImported} events imported.`);
      setImportMsg({text:`✅ Connected! ${data.eventsImported} upcoming bookings imported from ${data.calendarName||"Airbnb"}. Auto-syncs every 30 min.`,ok:true});
      setUrl(""); setName(""); setShowFileUpload(false);
      refetchSyncs(); qc.invalidateQueries({queryKey:["calendar"]});
    } else {
      setProgress(0); setProgressStep("");
      if(data.useFileUpload||data.error?.includes("fetch")){
        setShowFileUpload(true);
        setImportMsg({text:`⚠️ All proxies failed to reach Airbnb. Use the file upload below — it takes 10 seconds and then auto-syncs daily.`,ok:false});
      } else {
        setImportMsg({text:`❌ ${data.error||"Unknown error"}`,ok:false});
      }
    }
  };

  const addSync=async()=>{ if(!url)return; setAdding(true); setImportMsg(null); await runWithProgress({icalUrl:url,calendarName:name||"Airbnb",provider:"AIRBNB"}); setAdding(false); };
  const syncFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file)return;
    setAdding(true); setImportMsg(null);
    const content=await new Promise<string>(res=>{const r=new FileReader();r.onload=ev=>res(ev.target?.result as string);r.readAsText(file);});
    await runWithProgress({icalContent:content,calendarName:name||file.name.replace(".ics",""),provider:"AIRBNB"});
    setAdding(false);
  };
  const resync=async(syncId:string,icalUrl:string,cname:string)=>{
    setSyncing(syncId);
    const res=await fetch("/api/external",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({icalUrl,calendarName:cname,provider:"AIRBNB",syncId})});
    const data=await res.json();
    if(res.ok){refetchSyncs();qc.invalidateQueries({queryKey:["calendar"]});}
    setSyncing(null);
  };

  return(
    <Section title="Airbnb / iCal Sync" sub="Two-way calendar sync — use one or both independently">

      {/* ── Import card ── */}
      <Card className="overflow-hidden">
        <div className="p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{background:"rgba(236,72,153,0.12)"}}>📥</div>
            <div>
              <p className="font-semibold" style={{color:"var(--text)"}}>Import from Airbnb</p>
              <p className="text-xs mt-0.5" style={{color:"var(--muted)"}}>Paste your Airbnb iCal link — bookings auto-block on your VenueOS calendar</p>
              {syncs.length>0&&<p className="text-xs mt-1 font-medium" style={{color:"#10b981"}}>● {syncs.length} calendar{syncs.length!==1?"s":""} connected</p>}
            </div>
          </div>
          <button onClick={()=>{setImportOpen(p=>!p);setImportMsg(null);setShowFileUpload(false);}}
            className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{background:importOpen?"rgba(245,158,11,0.15)":"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.4)",color:"#f59e0b"}}>
            {importOpen?"▲ Hide":"▼ Set Up"}
          </button>
        </div>

        {importOpen&&(
          <div className="px-5 pb-5 space-y-4 border-t" style={{borderColor:"var(--border)"}}>
            {/* How-to */}
            <div className="rounded-lg p-3 mt-4 text-xs" style={{background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",color:"#60a5fa"}}>
              <strong>How to get your Airbnb iCal link:</strong><br/>
              Airbnb → your listing → <strong>Calendar</strong> → <strong>Availability settings</strong> → scroll to bottom → <strong>Export Calendar</strong> → copy the .ics link
            </div>

            {/* Name + URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FL label="Calendar Name"><VI value={name} onChange={setName} placeholder="e.g. Airbnb Skyview Suite"/></FL>
              <FL label="Airbnb iCal URL"><VI value={url} onChange={setUrl} placeholder="https://www.airbnb.co.in/calendar/ical/...ics?t=..."/></FL>
            </div>

            <div className="space-y-3">
              {/* Primary: auto-download + upload (always works) */}
              <div className="rounded-xl p-4 space-y-3" style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.25)"}}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:"#f59e0b",color:"#000"}}>RECOMMENDED</span>
                  <p className="text-xs font-semibold" style={{color:"var(--text)"}}>2-click method — always works</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <a href={url||"#"} target="_blank" rel="noopener noreferrer"
                    onClick={e=>{if(!url){e.preventDefault();}}}
                    className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${!url?"opacity-40 pointer-events-none":""}`}
                    style={{background:"var(--s2)",border:"1px solid var(--border)",color:"var(--text)"}}>
                    1️⃣ Download .ics from Airbnb
                  </a>
                  <label className={`px-4 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-colors ${adding?"opacity-40 pointer-events-none":""}`}
                    style={{background:"#f59e0b",color:"#000"}}>
                    2️⃣ Upload the downloaded file
                    <input type="file" accept=".ics,text/calendar" className="hidden" onChange={syncFile} disabled={adding}/>
                  </label>
                </div>
                <p className="text-xs" style={{color:"var(--subtle)"}}>Step 1 opens Airbnb in a new tab and downloads the file. Step 2 uploads it here — done in 10 seconds. After that it auto-syncs daily.</p>
              </div>
              {/* Secondary: direct URL (tries 3 servers in parallel) */}
              <div className="flex items-center gap-3">
                <button onClick={addSync} disabled={!url||adding}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                  style={{background:"var(--s2)",border:"1px solid var(--border)",color:"var(--muted)"}}>
                  {adding?"Trying...":"Try auto-import via URL"}
                </button>
                <p className="text-xs" style={{color:"var(--subtle)"}}>May fail if Airbnb blocks our server</p>
              </div>
            </div>

            {/* Progress bar */}
            {adding&&(
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium" style={{color:"#f59e0b"}}>{progressStep}</p>
                  <p className="text-xs font-bold" style={{color:"#f59e0b"}}>{progress}%</p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{background:"var(--s2)"}}>
                  <div className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{width:`${progress}%`,background:"linear-gradient(90deg,#f59e0b,#f97316)",boxShadow:"0 0 8px rgba(245,158,11,0.5)"}}/>
                </div>
                <p className="text-[11px]" style={{color:"var(--subtle)"}}>This can take up to 20 seconds — trying multiple servers to bypass Airbnb's restrictions</p>
              </div>
            )}

            {/* Status message */}
            {!adding&&importMsg&&(
              <div className="rounded-lg p-3 text-sm" style={{background:importMsg.ok?"rgba(16,185,129,0.1)":"rgba(245,158,11,0.08)",border:`1px solid ${importMsg.ok?"rgba(16,185,129,0.3)":"rgba(245,158,11,0.25)"}`,color:importMsg.ok?"#10b981":"#f59e0b"}}>
                {importMsg.text}
                {showFileUpload&&!importMsg.ok&&(
                  <div className="mt-3 pt-3 text-xs space-y-1" style={{borderTop:"1px solid rgba(245,158,11,0.2)",color:"var(--muted)"}}>
                    <p className="font-semibold" style={{color:"var(--text)"}}>Quick file upload (10 seconds):</p>
                    <p>1. Open this link in your browser — it downloads a file automatically:</p>
                    <code className="block px-2 py-1 rounded text-[11px] break-all" style={{background:"var(--s2)",color:"#f59e0b"}}>{url}</code>
                    <p>2. Click <strong style={{color:"var(--text)"}}>Upload .ics File</strong> above → select the downloaded file → done</p>
                  </div>
                )}
              </div>
            )}

            {/* Connected calendars */}
            {syncs.length>0&&(
              <div className="space-y-2 pt-2 border-t" style={{borderColor:"var(--border)"}}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{color:"var(--muted)"}}>Connected Calendars</p>
                {syncs.map((s:any)=>(
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg" style={{background:"var(--s2)"}}>
                    <span>🏠</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{color:"var(--text)"}}>{s.calendarName}</p>
                      <p className="text-xs" style={{color:"var(--muted)"}}>Last synced: {s.lastSyncedAt?new Date(s.lastSyncedAt).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"Never"}</p>
                    </div>
                    <button onClick={()=>resync(s.id,s.icalUrl,s.calendarName)} disabled={syncing===s.id}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                      style={{background:"var(--s1)",border:"1px solid var(--border)",color:"var(--text)"}}>
                      {syncing===s.id?"⏳ Syncing...":"⟳ Re-sync"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Export card ── */}
      <Card className="overflow-hidden">
        <div className="p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{background:"rgba(16,185,129,0.12)"}}>📤</div>
            <div>
              <p className="font-semibold" style={{color:"var(--text)"}}>Export to Airbnb</p>
              <p className="text-xs mt-0.5" style={{color:"var(--muted)"}}>Give Airbnb this link — your confirmed venue bookings auto-block on your Airbnb listing</p>
            </div>
          </div>
          <button onClick={()=>setExportOpen(p=>!p)}
            className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{background:exportOpen?"rgba(16,185,129,0.15)":"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.4)",color:"#10b981"}}>
            {exportOpen?"▲ Hide":"▼ Get Link"}
          </button>
        </div>

        {exportOpen&&(
          <div className="px-5 pb-5 space-y-3 border-t" style={{borderColor:"var(--border)"}}>
            <div className="rounded-lg p-3 mt-4 text-xs" style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",color:"#34d399"}}>
              <strong>How to give this link to Airbnb:</strong><br/>
              Airbnb → your listing → <strong>Calendar</strong> → <strong>Availability settings</strong> → scroll down → <strong>Import Calendar</strong> → paste the URL below
            </div>
            <p className="text-xs" style={{color:"var(--muted)"}}>Your VenueOS export link:</p>
            <div className="flex gap-2">
              <code className="flex-1 rounded-lg px-3 py-2.5 text-xs font-mono break-all" style={{background:"var(--s2)",border:"1px solid var(--border)",color:"#f59e0b"}}>{exportUrl}</code>
            </div>
            <button onClick={()=>{try{navigator.clipboard.writeText(exportUrl);}catch{}setExportCopied(true);setTimeout(()=>setExportCopied(false),2500);}}
              className="px-5 py-2.5 rounded-lg text-sm font-bold transition-colors"
              style={{background:exportCopied?"#10b981":"#f59e0b",color:"#000"}}>
              {exportCopied?"✓ Copied to clipboard!":"📋 Copy Export Link"}
            </button>
          </div>
        )}
      </Card>
    </Section>
  );
}

// ── Add Lead Modal ──────────────────────────────────────────────
const LEAD_SOURCES = ["Direct","Website","Referral","Social Media","Aggregator","BDE Outreach"];
const BDE_NAMES    = ["Sneha Reddy","Karan Mehta","Divya Nair","Unassigned"];

function AddLeadModal({onClose,onSave}:{onClose:()=>void;onSave:(l:typeof LEADS[0])=>void}){
  const [f,setF]=useState({name:"",phone:"",email:"",event:EVENT_TYPES[0],date:"",pax:"",budgetMin:"",budgetMax:"",source:LEAD_SOURCES[0],bde:BDE_NAMES[0],notes:""});
  const [saved,setSaved]=useState(false);
  const upd=(k:string,v:string)=>setF(p=>({...p,[k]:v}));

  const submit=()=>{
    const budget=f.budgetMin&&f.budgetMax?`₹${parseInt(f.budgetMin).toLocaleString("en-IN")}–₹${parseInt(f.budgetMax).toLocaleString("en-IN")}`:f.budgetMin?`₹${parseInt(f.budgetMin).toLocaleString("en-IN")}+`:"TBD";
    onSave({name:f.name,event:f.event,date:f.date||"TBD",budget,status:"NEW",bde:f.bde.split(" ")[0]+" "+f.bde.split(" ")[1]?.[0]+"."||""});
    setSaved(true); setTimeout(onClose,1500);
  };

  if(saved)return <Modal title="Lead Added" onClose={onClose}><div className="text-center py-8"><p className="text-5xl mb-3">🎯</p><p className="font-bold text-lg" style={{color:"var(--text)"}}>Lead created!</p><p className="text-sm mt-1" style={{color:"var(--muted)"}}>{f.name} — {f.event}</p></div></Modal>;

  return(
    <Modal title="Add New Lead" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FL label="Contact Name *"><VI value={f.name} onChange={v=>upd("name",v)} placeholder="e.g. Priya Sharma"/></FL>
          <FL label="Phone Number"><VI value={f.phone} onChange={v=>upd("phone",v.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile"/></FL>
          <FL label="Email Address"><VI value={f.email} onChange={v=>upd("email",v)} placeholder="priya@company.com"/></FL>
          <FL label="Event Type *"><VS value={f.event} onChange={v=>upd("event",v)} options={EVENT_TYPES}/></FL>
          <FL label="Tentative Date"><VI value={f.date} onChange={v=>upd("date",v)} placeholder="e.g. Nov 2025"/></FL>
          <FL label="Expected Guests"><VI value={f.pax} onChange={v=>upd("pax",v.replace(/\D/g,""))} placeholder="e.g. 300"/></FL>
          <FL label="Budget Min (₹)"><VI value={f.budgetMin} onChange={v=>upd("budgetMin",v.replace(/\D/g,""))} placeholder="e.g. 500000"/></FL>
          <FL label="Budget Max (₹)"><VI value={f.budgetMax} onChange={v=>upd("budgetMax",v.replace(/\D/g,""))} placeholder="e.g. 1000000"/></FL>
          <FL label="Lead Source"><VS value={f.source} onChange={v=>upd("source",v)} options={LEAD_SOURCES}/></FL>
          <FL label="Assign to BDE"><VS value={f.bde} onChange={v=>upd("bde",v)} options={BDE_NAMES}/></FL>
        </div>
        <FL label="Notes / Requirements">
          <textarea value={f.notes} onChange={e=>upd("notes",e.target.value)} placeholder="Any initial requirements or context..." rows={3} className="v-input resize-none"/>
        </FL>
        {f.budgetMin&&f.budgetMax&&(
          <div className="rounded-lg p-3 text-sm flex items-center gap-3" style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)"}}>
            <span style={{color:"var(--muted)"}}>Budget range:</span>
            <strong style={{color:"#f59e0b"}}>₹{parseInt(f.budgetMin).toLocaleString("en-IN")} – ₹{parseInt(f.budgetMax).toLocaleString("en-IN")}</strong>
          </div>
        )}
        <button onClick={submit} disabled={!f.name||!f.event} className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold rounded-lg transition-colors">
          🎯 Add Lead to Pipeline
        </button>
      </div>
    </Modal>
  );
}

function LeadsView(){
  const qc=useQueryClient();
  const {data:leads=[]}=useQuery({queryKey:["leads"],queryFn:()=>fetch("/api/leads").then(r=>r.json())});
  const [modal,setModal]=useState(false);
  const handleSave=async(l:any)=>{
    await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});
    await qc.invalidateQueries({queryKey:["leads"]});
  };
  return(
    <Section title="Leads & CRM" sub={`Active pipeline · ${leads.length} leads`} btn="+ Add Lead" onBtn={()=>setModal(true)}>
      {modal&&<AddLeadModal onClose={()=>setModal(false)} onSave={l=>{handleSave(l);setModal(false);}}/>}
      <div className="flex gap-2 flex-wrap">
        {PIPELINE.map(p=>(
          <div key={p.stage} className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{background:"var(--s1)",border:"1px solid var(--border)"}}>
            <div className="w-2 h-2 rounded-full" style={{background:p.color}}/><span className="text-xs" style={{color:"var(--text)"}}>{p.stage}</span><span className="text-xs font-semibold" style={{color:p.color}}>{p.count}</span>
          </div>
        ))}
      </div>
      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {leads.map((l,i)=>(
          <Card key={i} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="font-semibold text-sm" style={{color:"var(--text)"}}>{l.name}</p>
              <Badge status={l.status}/>
            </div>
            <p className="text-xs mb-2" style={{color:"var(--muted)"}}>{l.event} · {l.date}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{color:"#f59e0b"}}>{l.budget}</span>
              <span className="text-xs" style={{color:"var(--muted)"}}>BDE: {l.bde}</span>
            </div>
          </Card>
        ))}
        {!leads.length&&<p className="text-center py-6 text-sm" style={{color:"var(--muted)"}}>No leads yet</p>}
      </div>
      {/* Desktop table */}
      <Card className="overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
        <table className="w-full"><THead cols={["Lead","Event","Date","Budget","Status","BDE"]}/>
          <tbody>{leads.map((l,i)=>(
            <Row key={i}><Td style={{color:"var(--text)",fontWeight:500} as React.CSSProperties}>{l.name}</Td><Td style={{color:"var(--muted)"} as React.CSSProperties}>{l.event}</Td><Td style={{color:"var(--muted)"} as React.CSSProperties}>{l.date}</Td><Td style={{color:"#f59e0b",fontWeight:500} as React.CSSProperties}>{l.budget}</Td><Td><Badge status={l.status}/></Td><Td style={{color:"var(--muted)"} as React.CSSProperties}>{l.bde}</Td></Row>
          ))}</tbody>
        </table>
        </div>
      </Card>
    </Section>
  );
}

function CreditNoteModal({inv,onClose,onSave}:{inv:any;onClose:()=>void;onSave:()=>void}){
  const [reason,setReason]=useState("");
  const [amount,setAmount]=useState("");
  const [saved,setSaved]=useState(false);
  const a=parseFloat(amount||"0")||0;
  const cgst=Math.round(a*.09),sgst=Math.round(a*.09),total=a+cgst+sgst;
  const submit=async()=>{
    await fetch("/api/credit-notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({invoiceId:inv.id,invoiceNumber:inv.num,reason,amount:a,cgstAmount:cgst,sgstAmount:sgst,totalAmount:total})});
    setSaved(true);setTimeout(()=>{onSave();onClose();},1500);
  };
  if(saved)return <Modal title="Credit Note Issued" onClose={onClose}><div className="text-center py-8"><p className="text-5xl mb-3">✅</p><p className="font-bold text-lg" style={{color:"var(--text)"}}>Credit Note issued successfully</p></div></Modal>;
  return(
    <Modal title={`Credit Note — ${inv.num}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg p-3 text-sm" style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)",color:"#d97706"}}>
          Issuing a credit note partially or fully reverses <strong>{inv.num}</strong> for GST compliance.
        </div>
        <FL label="Reason for Credit Note">
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="e.g. Event cancelled, partial refund, overbilled..." className="v-input resize-none"/>
        </FL>
        <FL label="Credit Amount (₹ taxable — 18% GST applied automatically)">
          <VI value={amount} onChange={v=>setAmount(v.replace(/[^\d.]/g,""))} placeholder="e.g. 50000"/>
        </FL>
        {a>0&&(
          <div className="rounded-lg p-4 text-sm space-y-1.5" style={{background:"var(--s2)",border:"1px solid var(--border)"}}>
            <div className="flex justify-between" style={{color:"var(--muted)"}}><span>Taxable Credit</span><span>{fmt(a)}</span></div>
            <div className="flex justify-between" style={{color:"var(--muted)"}}><span>CGST 9%</span><span style={{color:"#f59e0b"}}>{fmt(cgst)}</span></div>
            <div className="flex justify-between" style={{color:"var(--muted)"}}><span>SGST 9%</span><span style={{color:"#f59e0b"}}>{fmt(sgst)}</span></div>
            <div className="flex justify-between font-bold text-base" style={{color:"var(--text)",borderTop:"1px solid var(--border)",paddingTop:"0.5rem"}}><span>Total Credit</span><span>{fmt(total)}</span></div>
          </div>
        )}
        <button onClick={submit} disabled={!reason||!a} className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold rounded-lg transition-colors">
          Issue Credit Note — {a>0?fmt(total):"Enter amount"}
        </button>
      </div>
    </Modal>
  );
}

function InvoicesView(){
  const qc=useQueryClient();
  const {data:invs=[]}=useQuery({queryKey:["invoices"],queryFn:()=>fetch("/api/invoices").then(r=>r.json())});
  const [creating,setCreating]=useState(false);
  const [pdfInv,setPdfInv]=useState<any|null>(null);
  const [editIdx,setEditIdx]=useState<number|null>(null);
  const [editVal,setEditVal]=useState("");
  const [creditInv,setCreditInv]=useState<any|null>(null);
  const [pfx,setPfx]=useState(DEFAULT_PREFIX);
  const [showPfx,setShowPfx]=useState(false);

  const handleCreateInv=async(inv:any)=>{
    await fetch("/api/invoices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(inv)});
    await qc.invalidateQueries({queryKey:["invoices"]});
  };
  const handleEditNum=async(id:string,num:string)=>{
    await fetch("/api/invoices",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,invoiceNumber:num})});
    await qc.invalidateQueries({queryKey:["invoices"]});setEditIdx(null);
  };
  const handleMarkPaid=async(id:string)=>{
    await fetch("/api/invoices",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:"PAID"})});
    await qc.invalidateQueries({queryKey:["invoices"]});
  };

  const totalBilled=(invs as any[]).reduce((s:number,i:any)=>s+i.total,0);
  const totalGst=(invs as any[]).reduce((s:number,i:any)=>s+i.cgst+i.sgst,0);
  const outstanding=(invs as any[]).filter((i:any)=>["SENT","OVERDUE"].includes(i.status)).reduce((s:number,i:any)=>s+i.total,0);
  const preview=`${pfx.prefix}${pfx.separator}${pfx.yearCode}${pfx.separator}0045${pfx.suffix}`;

  return(
    <Section title="Invoices" sub="GST-compliant · Karnataka CGST+SGST" btn="+ Create Invoice" onBtn={()=>setCreating(true)}>
      {creating&&<InvoiceCreateModal onClose={()=>setCreating(false)} onSave={inv=>{handleCreateInv(inv);setCreating(false);}} pfx={pfx}/>}
      {pdfInv&&<InvoicePDFModal inv={pdfInv} onClose={()=>setPdfInv(null)}/>}
      {creditInv&&<CreditNoteModal inv={creditInv} onClose={()=>setCreditInv(null)} onSave={()=>qc.invalidateQueries({queryKey:["invoices"]})}/>}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[{l:"Total Billed",v:fmt(totalBilled),c:"var(--text)"},{l:"GST Collected",v:fmt(totalGst),c:"#f59e0b"},{l:"Outstanding",v:fmt(outstanding),c:"#ef4444"}].map(s=>(
          <Card key={s.l} className="px-4 py-3">
            <p className="text-xs uppercase tracking-wider" style={{color:"var(--muted)"}}>{s.l}</p>
            <p className="text-base sm:text-lg font-bold mt-0.5 truncate" style={{color:s.c}}>{s.v}</p>
          </Card>
        ))}
      </div>

      {/* Prefix config */}
      <div className="flex justify-end">
        <button onClick={()=>setShowPfx(p=>!p)} className="px-3 py-2 text-xs rounded-lg transition-colors" style={{background:"var(--s1)",border:"1px solid var(--border)",color:"var(--text)"}}>⚙️ Invoice Prefix</button>
      </div>
      {showPfx&&(
        <Card className="p-4" style={{borderColor:"rgba(245,158,11,0.3)"}}>
          <p className="text-sm font-semibold mb-3" style={{color:"var(--text)"}}>Invoice Number Format</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <FL label="Prefix"><VI value={pfx.prefix} onChange={v=>setPfx(p=>({...p,prefix:v.toUpperCase()}))}/></FL>
            <FL label="Separator"><VS value={pfx.separator} onChange={v=>setPfx(p=>({...p,separator:v}))} options={["/","-","_",".","|"]}/></FL>
            <FL label="Year Code"><VI value={pfx.yearCode} onChange={v=>setPfx(p=>({...p,yearCode:v}))}/></FL>
            <FL label="Suffix (optional)"><VI value={pfx.suffix} onChange={v=>setPfx(p=>({...p,suffix:v}))} placeholder="-TAX"/></FL>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs" style={{color:"var(--muted)"}}>Preview:</p>
            <code className="font-mono font-bold text-base" style={{color:"#f59e0b"}}>{preview}</code>
          </div>
        </Card>
      )}

      {/* Mobile card list (hidden on md+) */}
      <div className="space-y-3 md:hidden">
        {(invs as any[]).map((inv:any,i:number)=>(
          <Card key={i} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold" style={{color:"#f59e0b"}}>{inv.num}</p>
                <p className="font-semibold text-sm mt-0.5" style={{color:"var(--text)"}}>{inv.client}</p>
              </div>
              <Badge status={inv.status}/>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span style={{color:"var(--muted)"}}>Taxable </span><span style={{color:"var(--text)"}}>{fmt(inv.taxable)}</span></div>
              <div><span style={{color:"var(--muted)"}}>GST </span><span style={{color:"#f59e0b"}}>{fmt(inv.cgst+inv.sgst)}</span></div>
              <div><span style={{color:"var(--muted)"}}>Total </span><span className="font-bold" style={{color:"var(--text)"}}>{fmt(inv.total)}</span></div>
              <div><span style={{color:"var(--muted)"}}>Due </span><span style={{color:"var(--text)"}}>{inv.due}</span></div>
            </div>
            <div className="flex gap-2 flex-wrap pt-1" style={{borderTop:"1px solid var(--border)"}}>
              <button onClick={()=>setPdfInv(inv)} className="text-xs font-medium px-2 py-1 rounded" style={{background:"rgba(245,158,11,0.1)",color:"#f59e0b"}}>📄 PDF</button>
              {["SENT","OVERDUE"].includes(inv.status)&&<button onClick={()=>handleMarkPaid(inv.id)} className="text-xs font-medium px-2 py-1 rounded" style={{background:"rgba(16,185,129,0.1)",color:"#10b981"}}>✓ Mark Paid</button>}
              {["PAID","SENT"].includes(inv.status)&&<button onClick={()=>setCreditInv(inv)} className="text-xs font-medium px-2 py-1 rounded" style={{background:"rgba(239,68,68,0.1)",color:"#ef4444"}}>↩ Credit Note</button>}
              <button onClick={()=>{setEditIdx(i);setEditVal(inv.num);}} className="text-xs px-2 py-1 rounded" style={{background:"var(--s2)",border:"1px solid var(--border)",color:"var(--muted)"}}>✏️</button>
            </div>
            {editIdx===i&&(
              <div className="flex gap-1.5 items-center pt-1">
                <input value={editVal} onChange={e=>setEditVal(e.target.value)} className="v-input font-mono text-xs flex-1 py-1" style={{borderColor:"rgba(245,158,11,0.5)"}}/>
                <button onClick={()=>handleEditNum(inv.id,editVal)} style={{color:"#10b981",fontSize:"13px"}}>✓</button>
                <button onClick={()=>setEditIdx(null)} style={{color:"var(--subtle)",fontSize:"13px"}}>✕</button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Desktop table (hidden on mobile) */}
      <Card className="overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
        <table className="w-full"><THead cols={["Invoice #","Client","Taxable","GST","Total","Due","Status","Actions"]}/>
          <tbody>{(invs as any[]).map((inv:any,i:number)=>(
            <Row key={i}>
              <Td>
                {editIdx===i
                  ? <div className="flex gap-1.5 items-center">
                      <input value={editVal} onChange={e=>setEditVal(e.target.value)} className="v-input font-mono text-xs w-36 py-1" style={{borderColor:"rgba(245,158,11,0.5)"}}/>
                      <button onClick={()=>handleEditNum(invs[i].id,editVal)} style={{color:"#10b981",fontSize:"12px"}}>✓</button>
                      <button onClick={()=>setEditIdx(null)} style={{color:"var(--subtle)",fontSize:"12px"}}>✕</button>
                    </div>
                  : <span className="font-mono text-xs" style={{color:"#f59e0b"}}>{inv.num}</span>
                }
              </Td>
              <Td style={{color:"var(--text)",fontWeight:500} as React.CSSProperties}>{inv.client}</Td>
              <Td style={{color:"var(--muted)"} as React.CSSProperties}>{fmt(inv.taxable)}</Td>
              <Td style={{color:"#f59e0b"} as React.CSSProperties}>{fmt(inv.cgst+inv.sgst)}</Td>
              <Td style={{color:"var(--text)",fontWeight:600} as React.CSSProperties}>{fmt(inv.total)}</Td>
              <Td style={{color:"var(--muted)"} as React.CSSProperties}>{inv.due}</Td>
              <Td><Badge status={inv.status}/></Td>
              <Td>
                <div className="flex gap-2 items-center flex-wrap">
                  <button onClick={()=>setPdfInv(inv)} className="text-xs font-medium" style={{color:"#f59e0b"}}>📄 PDF</button>
                  {["SENT","OVERDUE"].includes(inv.status)&&<button onClick={()=>handleMarkPaid(inv.id)} className="text-xs font-medium" style={{color:"#10b981"}}>✓ Paid</button>}
                  {["PAID","SENT"].includes(inv.status)&&<button onClick={()=>setCreditInv(inv)} className="text-xs font-medium" style={{color:"#ef4444"}}>↩ CN</button>}
                  <button onClick={()=>{setEditIdx(i);setEditVal(inv.num);}} className="text-xs" style={{color:"var(--muted)"}}>✏️</button>
                </div>
              </Td>
            </Row>
          ))}</tbody>
        </table>
        </div>
      </Card>
    </Section>
  );
}

function ExpensesView(){
  const {data:expData}=useQuery({queryKey:["expenses"],queryFn:()=>fetch("/api/expenses").then(r=>r.json())});
  const cats:typeof EXP_CATS = expData?.categories ?? EXP_CATS;
  const monthly:typeof EXP_MONTHLY = expData?.monthly ?? EXP_MONTHLY;
  const [selMonth,setSel]=useState(()=>new Date().getMonth()%6);
  const total=cats.reduce((s,c)=>s+c.amount,0);
  const mData=monthly[selMonth]??monthly[0];
  const maxCat=Math.max(...cats.map(c=>c.amount),1);
  return(
    <Section title="Expense Monitor" sub="Monthly operating cost breakdown — all categories">
      <div className="flex gap-2 flex-wrap">
        {monthly.map((m,i)=>(
          <button key={m.month} onClick={()=>setSel(i)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={selMonth===i?{background:"#f59e0b",color:"#000"}:{background:"var(--s1)",border:"1px solid var(--border)",color:"var(--muted)"}}>
            {m.month}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-1 md:col-span-2 p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-semibold" style={{color:"var(--text)"}}>{monthly[selMonth]?.month} 2025 Breakdown</p>
            <p className="font-bold" style={{color:"#f59e0b"}}>{fmt(total)}</p>
          </div>
          <div className="space-y-3">
            {cats.map((c,i)=>{const v=(mData as any)[EXP_KEYS[i]] as number??c.amount;return(
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-lg w-6">{c.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1"><span style={{color:"var(--text)"}}>{c.name}</span><span className="font-semibold" style={{color:c.color}}>{fmt(v)}</span></div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{background:"var(--s2)"}}><div className="h-full rounded-full" style={{width:`${(v/maxCat)*100}%`,background:c.color}}/></div>
                </div>
              </div>
            );})}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold mb-4" style={{color:"var(--text)"}}>6-Month Trend</p>
          <div className="flex items-end gap-2 h-36">
            {monthly.map((m,i)=>{
              const s=EXP_KEYS.reduce((acc,k)=>acc+((m as any)[k] as number??0),0);
              const max=Math.max(...monthly.map(mm=>EXP_KEYS.reduce((a,k)=>a+((mm as any)[k] as number??0),0)),1);
              return(<div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-sm" style={{height:`${(s/max)*120}px`,background:i===selMonth?"#f59e0b":"var(--border)"}}/>
                <span className="text-[10px]" style={{color:"var(--subtle)"}}>{m.month}</span>
              </div>);
            })}
          </div>
        </Card>
      </div>
    </Section>
  );
}

function StaffView(){
  const qc=useQueryClient();
  const {data:staffList=[]}=useQuery({queryKey:["staff"],queryFn:()=>fetch("/api/staff").then(r=>r.json())});
  const [tab,setTab]=useState<StaffCategory>("security");
  const [addModal,setAddModal]=useState(false);
  const [editStaff,setEditStaff]=useState<Staff|null>(null);
  const [confirmDel,setConfirmDel]=useState<string|null>(null);
  const handleAdd=async(s:Staff)=>{
    await fetch("/api/staff",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});
    await qc.invalidateQueries({queryKey:["staff"]});
  };
  const handleEdit=async(s:Staff)=>{
    await fetch("/api/staff",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});
    await qc.invalidateQueries({queryKey:["staff"]});
  };
  const handleDelete=async(id:string)=>{
    const s=staffList.find((x:any)=>x.id===id);
    if(s?.dbId){await fetch("/api/staff",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({dbId:s.dbId})});}
    await qc.invalidateQueries({queryKey:["staff"]});
  };

  const filtered=staffList.filter(s=>s.category===tab);
  const cat=STAFF_CATEGORIES.find(c=>c.id===tab)!;
  const isStrict=cat.compliance==="STRICT";

  const saveStaff=(s:Staff)=>{const existing=staffList.find((x:any)=>x.id===s.id);existing?handleEdit(s):handleAdd(s);};
  const deleteStaff=(id:string)=>{handleDelete(id);setConfirmDel(null);};

  const stats=isStrict?[
    {l:"Total",v:filtered.length},{l:"BGV Cleared",v:filtered.filter(s=>s.bgv==="CLEARED").length},
    {l:"In Progress",v:filtered.filter(s=>s.bgv==="IN_PROGRESS").length},{l:"Police NOC",v:filtered.filter(s=>s.police).length},
  ]:[
    {l:"Total",v:filtered.length},{l:"BGV Cleared",v:filtered.filter(s=>s.bgv==="CLEARED").length},
    {l:"Pending",v:filtered.filter(s=>s.bgv!=="CLEARED").length},{l:"Vendors",v:new Set(filtered.map(s=>s.vendor).filter(v=>v!=="Direct Hire")).size},
  ];

  return(
    <Section title="Staff Management" sub="Add, edit & track staff across all departments">
      {(addModal||editStaff)&&<StaffModal initial={editStaff??undefined} onClose={()=>{setAddModal(false);setEditStaff(null);}} onSave={saveStaff}/>}

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        {STAFF_CATEGORIES.map(c=>(
          <button key={c.id} onClick={()=>setTab(c.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            style={tab===c.id?{background:"#f59e0b",color:"#000"}:{background:"var(--s1)",border:"1px solid var(--border)",color:"var(--muted)"}}>
            {c.icon} {c.label}
            <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{background:"rgba(0,0,0,0.15)"}}>{staffList.filter(s=>s.category===c.id).length}</span>
          </button>
        ))}
        <button onClick={()=>setAddModal(true)} className="ml-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-colors">➕ Add Staff</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s=>(
          <Card key={s.l} className="p-4"><p className="text-xs uppercase tracking-wider mb-1" style={{color:"var(--muted)"}}>{s.l}</p><p className="text-2xl font-bold" style={{color:"var(--text)"}}>{s.v}</p></Card>
        ))}
      </div>

      {/* Staff cards */}
      {filtered.length===0?(
        <Card className="p-12 text-center">
          <p className="text-4xl mb-2">{cat.icon}</p>
          <p className="font-semibold" style={{color:"var(--text)"}}>No {cat.label} staff added yet</p>
          <button onClick={()=>setAddModal(true)} className="mt-4 px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg text-sm">➕ Add {cat.label} Staff</button>
        </Card>
      ):(
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s,i)=>(
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <StaffAvatar staff={s} size={10}/>
                  <div><p className="font-semibold text-sm" style={{color:"var(--text)"}}>{s.name}</p><p className="text-xs" style={{color:"var(--muted)"}}>{s.role}</p></div>
                </div>
                <button onClick={()=>setEditStaff(s)} className="text-xs px-2 py-1 rounded transition-colors" style={{background:"var(--s2)",border:"1px solid var(--border)",color:"var(--muted)"}}>✏️ Edit</button>
              </div>
              <Badge status={s.bgv}/>
              <div className="mt-3 space-y-1.5 text-xs">
                {[["ID",s.id],["Shift",s.shift],["Phone",s.phone],["Joined",s.joining],s.vendor!=="Direct Hire"?["Vendor",s.vendor]:null,isStrict?["Police NOC",s.police?"✓ Yes":"✕ No"]:null,s.certExp&&s.certExp!=="—"?["Cert Expiry",s.certExp]:null,s.notes?["Notes",s.notes]:null].filter((x): x is string[] => x !== null).map(([k,v])=>(
                  <div key={k as string} className="flex justify-between gap-2">
                    <span style={{color:"var(--subtle)"}}>{k as string}</span>
                    <span className="text-right" style={{color:k==="Phone"?"#f59e0b":k==="Police NOC"?(v==="✓ Yes"?"#10b981":"#ef4444"):"var(--text)"}}>{v as string}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3" style={{borderTop:"1px solid var(--border)"}}>
                {confirmDel===s.id
                  ? <div className="flex gap-2 items-center">
                      <span className="text-xs" style={{color:"var(--muted)"}}>Remove {s.name}?</span>
                      <button onClick={()=>deleteStaff(s.id)} className="text-xs text-red-400 hover:text-red-300">Confirm</button>
                      <button onClick={()=>setConfirmDel(null)} className="text-xs" style={{color:"var(--subtle)"}}>Cancel</button>
                    </div>
                  : <button onClick={()=>setConfirmDel(s.id)} className="text-xs transition-colors" style={{color:"rgba(239,68,68,0.5)"}}>Remove staff</button>
                }
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}

function BdeView(){
  const qc=useQueryClient();
  const {data:bde=[]}=useQuery({queryKey:["bde"],queryFn:()=>fetch("/api/bde").then(r=>r.json())});
  const [localBde,setLocalBde]=useState<any[]>([]);
  useEffect(()=>{if(bde.length)setLocalBde(bde);},[bde]);
  const displayBde=localBde.length?localBde:bde;
  const [editing,setEditing]=useState<number|null>(null);
  const updateTarget=(i:number,v:number)=>setLocalBde(p=>p.map((b,j)=>j===i?{...b,target:v}:b));
  const updateRate=(i:number,v:number)=>setLocalBde(p=>p.map((b,j)=>j===i?{...b,rate:v,commission:Math.round(b.revenue*(v/100))}:b));
  return(
    <Section title="BDE Incentive Dashboard" sub="Click a card to edit targets and commission rate">
      <div className="rounded-lg p-3 text-sm" style={{border:"1px solid rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.07)",color:"#d97706"}}>
        <strong>Active Plan:</strong> Q1 FY2025 · Net Margin · 2% up to ₹5L · 3.5% up to ₹10L · 5% above ₹10L
      </div>
      <div className="space-y-4">
        {displayBde.map((b,i)=>{
          const pct=Math.min(100,Math.round((b.revenue/b.target)*100));
          const isEdit=editing===i;
          return(
            <Card key={i} className={`p-5 transition-colors ${isEdit?"":"cursor-pointer"}`} style={isEdit?{borderColor:"rgba(245,158,11,0.6)"}:{}} onClick={()=>!isEdit&&setEditing(i)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-black font-black text-sm" style={{background:"linear-gradient(135deg,#f59e0b,#f97316)"}}>{initials(b.name)}</div>
                  <div><p className="font-semibold" style={{color:"var(--text)"}}>{b.name}</p><p className="text-xs" style={{color:"var(--muted)"}}>{b.role} · {b.bookings} bookings</p></div>
                </div>
                <div className="text-right"><p className="font-bold text-lg" style={{color:"#f59e0b"}}>{fmt(b.commission)}</p><p className="text-xs" style={{color:"var(--subtle)"}}>commission earned</p></div>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs w-32 shrink-0" style={{color:"var(--muted)"}}>Revenue vs Target</span>
                <div className="flex-1 rounded-full h-3 overflow-hidden" style={{background:"var(--border)"}}><div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:pct>=100?"#10b981":"#f59e0b"}}/></div>
                <span className="text-xs font-bold w-10 text-right" style={{color:pct>=100?"#10b981":"#f59e0b"}}>{pct}%</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs mb-3">
                <span style={{color:"var(--muted)"}}>Achieved: <strong style={{color:"var(--text)"}}>{fmt(b.revenue)}</strong></span>
                <span style={{color:"var(--muted)"}}>Target: <strong style={{color:"#f59e0b"}}>{fmt(b.target)}</strong></span>
                <span style={{color:"var(--muted)"}}>Rate: <strong style={{color:"#10b981"}}>{b.rate}%</strong></span>
              </div>
              {isEdit&&(
                <div className="pt-4" style={{borderTop:"1px solid var(--border)"}} onClick={e=>e.stopPropagation()}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:"#f59e0b"}}>Edit Targets</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs mb-1 block" style={{color:"var(--muted)"}}>Revenue Target (₹)</label>
                      <input type="number" value={b.target} step={50000} onChange={e=>updateTarget(i,Number(e.target.value))} className="v-input"/>
                      <input type="range" min={500000} max={3000000} step={50000} value={b.target} onChange={e=>updateTarget(i,Number(e.target.value))} className="w-full mt-2 accent-amber-500"/>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{color:"var(--muted)"}}>Commission Rate (%)</label>
                      <input type="number" value={b.rate} step={0.5} min={0.5} max={10} onChange={e=>updateRate(i,Number(e.target.value))} className="v-input"/>
                      <input type="range" min={0.5} max={10} step={0.5} value={b.rate} onChange={e=>updateRate(i,Number(e.target.value))} className="w-full mt-2 accent-amber-500"/>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg px-4 py-3 mt-3" style={{background:"rgba(245,158,11,0.1)"}}>
                    <span className="text-sm" style={{color:"#d97706"}}>Recalculated Commission:</span>
                    <span className="font-bold text-lg" style={{color:"#f59e0b"}}>{fmt(Math.round(b.revenue*(b.rate/100)))}</span>
                  </div>
                  <button onClick={()=>setEditing(null)} className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm">✓ Save</button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════
// VENUE SETTINGS VIEW
// ═══════════════════════════════════════════════════════════════

function VenueSettingsView({config,onSave}:{config:VenueConfig;onSave:(c:VenueConfig)=>void}){
  const [f,setF]=useState<VenueConfig>(config);
  const [tab,setTab]=useState<"basic"|"media"|"facilities"|"spaces"|"contact">("basic");
  const [saved,setSaved]=useState(false);
  const upd=(k:keyof VenueConfig,v:unknown)=>setF(p=>({...p,[k]:v}));
  const {data:apiConfig}=useQuery({queryKey:["settings"],queryFn:()=>fetch("/api/settings").then(r=>r.json())});
  useEffect(()=>{if(apiConfig)setF((p:VenueConfig)=>({...p,...apiConfig}));},[apiConfig]);
  const save=async()=>{
    onSave(f);
    await fetch("/api/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});
    setSaved(true);setTimeout(()=>setSaved(false),2500);
  };

  const addFacility=()=>upd("facilities",[...f.facilities,{icon:"✨",name:"",desc:"",photo:""}]);
  const updFacility=(i:number,k:string,v:string)=>upd("facilities",f.facilities.map((x,j)=>j===i?{...x,[k]:v}:x));
  const delFacility=(i:number)=>upd("facilities",f.facilities.filter((_,j)=>j!==i));

  const addSpace=()=>upd("spaces",[...f.spaces,{name:"",capacity:"",rateFrom:"",desc:"",photo:""}]);
  const updSpace=(i:number,k:string,v:string)=>upd("spaces",f.spaces.map((x,j)=>j===i?{...x,[k]:v}:x));
  const delSpace=(i:number)=>upd("spaces",f.spaces.filter((_,j)=>j!==i));

  const updGallery=(i:number,v:string)=>upd("gallery",f.gallery.map((x,j)=>j===i?v:x));
  const addGallery=()=>f.gallery.length<12&&upd("gallery",[...f.gallery,""]);
  const delGallery=(i:number)=>upd("gallery",f.gallery.filter((_,j)=>j!==i));

  const TABS=[{id:"basic",label:"📋 Basic Info"},{id:"media",label:"🖼️ Photos & Media"},{id:"facilities",label:"✨ Facilities"},{id:"spaces",label:"🏛️ Spaces"},{id:"contact",label:"📞 Contact & Social"}] as const;
  const COMMON_ICONS=["❄️","🅿️","🎤","💡","🍽️","🎥","📶","🔒","🏊","🛗","♿","🚻","💐","🎭","🔥","🌿","☕","🧹","🏋️","🎮"];

  return(
    <div className="space-y-4 animate-slide-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{color:"var(--text)"}}>Venue Configuration</h1>
          <p className="text-sm mt-1" style={{color:"var(--muted)"}}>Set your venue details — this data powers the public portal website</p>
        </div>
        <button onClick={save} className="px-5 py-2 font-semibold rounded-lg transition-colors text-sm" style={{background:"#f59e0b",color:"#000"}}>
          {saved?"✓ Saved!":"💾 Save Changes"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className="px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
            style={tab===t.id?{background:"#f59e0b",color:"#000"}:{background:"var(--s1)",border:"1px solid var(--border)",color:"var(--muted)"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Basic Info ── */}
      {tab==="basic"&&(
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FL label="Venue Name"><VI value={f.name} onChange={v=>upd("name",v)} placeholder="Grand Palace Venues"/></FL>
            <FL label="Tagline"><VI value={f.tagline} onChange={v=>upd("tagline",v)} placeholder="Bengaluru's Premier Event Destination"/></FL>
          </div>
          <FL label="Description (shown on public portal)">
            <textarea value={f.description} onChange={e=>upd("description",e.target.value)} rows={4} placeholder="Describe your venue..." className="v-input resize-none"/>
          </FL>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FL label="Address Line 1"><VI value={f.addressLine1} onChange={v=>upd("addressLine1",v)} placeholder="No. 42, Outer Ring Road"/></FL>
            <FL label="City"><VI value={f.city} onChange={v=>upd("city",v)} placeholder="Bengaluru"/></FL>
            <FL label="State"><VI value={f.state} onChange={v=>upd("state",v)} placeholder="Karnataka"/></FL>
            <FL label="Pincode"><VI value={f.pincode} onChange={v=>upd("pincode",v)} placeholder="560037"/></FL>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FL label="Phone"><VI value={f.phone} onChange={v=>upd("phone",v)} placeholder="+91 98765 43210"/></FL>
            <FL label="Email"><VI value={f.email} onChange={v=>upd("email",v)} placeholder="events@venue.in"/></FL>
            <FL label="Website"><VI value={f.website} onChange={v=>upd("website",v)} placeholder="https://venue.in"/></FL>
          </div>
          <FL label="GSTIN"><VI value={f.gstin} onChange={v=>upd("gstin",v)} placeholder="29AABCG1234N1Z5"/></FL>
        </Card>
      )}

      {/* ── Media ── */}
      {tab==="media"&&(
        <div className="space-y-4">
          <Card className="p-6 space-y-4">
            <p className="font-semibold" style={{color:"var(--text)"}}>Hero & Logo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FL label="Cover Photo URL (hero image)">
                  <VI value={f.coverPhotoUrl} onChange={v=>upd("coverPhotoUrl",v)} placeholder="https://...jpg"/>
                </FL>
                {f.coverPhotoUrl&&<img src={f.coverPhotoUrl} alt="" className="mt-2 rounded-lg w-full h-28 object-cover" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}
              </div>
              <div>
                <FL label="Logo URL (shown in header)">
                  <VI value={f.logoUrl} onChange={v=>upd("logoUrl",v)} placeholder="https://...png"/>
                </FL>
                {f.logoUrl&&<img src={f.logoUrl} alt="" className="mt-2 h-16 object-contain rounded" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}
              </div>
            </div>
            <FL label="Promo Video URL (YouTube embed, optional)">
              <VI value={f.promoVideoUrl} onChange={v=>upd("promoVideoUrl",v)} placeholder="https://www.youtube.com/embed/VIDEOID"/>
            </FL>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold" style={{color:"var(--text)"}}>Photo Gallery ({f.gallery.length}/12)</p>
              <button onClick={addGallery} className="text-xs px-3 py-1.5 rounded-lg" style={{background:"var(--s2)",border:"1px solid var(--border)",color:"var(--text)"}}>+ Add Photo</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {f.gallery.map((url,i)=>(
                <div key={i} className="relative">
                  <VI value={url} onChange={v=>updGallery(i,v)} placeholder="https://...jpg"/>
                  {url&&<img src={url} alt="" className="mt-1.5 rounded-lg w-full h-20 object-cover" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}
                  <button onClick={()=>delGallery(i)} className="absolute top-1 right-1 text-xs rounded-full w-5 h-5 flex items-center justify-center" style={{background:"rgba(239,68,68,0.8)",color:"white"}}>✕</button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Facilities ── */}
      {tab==="facilities"&&(
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold" style={{color:"var(--text)"}}>Facilities & Amenities</p>
            <button onClick={addFacility} className="text-xs px-3 py-1.5 rounded-lg" style={{background:"var(--s2)",border:"1px solid var(--border)",color:"var(--text)"}}>+ Add Facility</button>
          </div>
          <div className="flex gap-2 flex-wrap mb-2">
            <p className="text-xs w-full" style={{color:"var(--subtle)"}}>Quick-pick icons:</p>
            {COMMON_ICONS.map(ic=><button key={ic} onClick={addFacility} className="text-xl hover:scale-125 transition-transform" title={ic}>{ic}</button>)}
          </div>
          <div className="space-y-3">
            {f.facilities.map((fc,i)=>(
              <div key={i} className="rounded-lg p-4" style={{background:"var(--s2)",border:"1px solid var(--border)"}}>
                <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-start">
                  <div className="col-span-1">
                    <FL label="Icon"><input value={fc.icon} onChange={e=>updFacility(i,"icon",e.target.value)} className="v-input text-center text-xl px-1" maxLength={2}/></FL>
                  </div>
                  <div className="col-span-1 sm:col-span-3"><FL label="Name"><VI value={fc.name} onChange={v=>updFacility(i,"name",v)} placeholder="e.g. AC"/></FL></div>
                  <div className="col-span-2 sm:col-span-4"><FL label="Description (optional)"><VI value={fc.desc} onChange={v=>updFacility(i,"desc",v)} placeholder="Short description..."/></FL></div>
                  <div className="col-span-2 sm:col-span-3"><FL label="Photo URL (optional)"><VI value={fc.photo} onChange={v=>updFacility(i,"photo",v)} placeholder="https://...jpg"/></FL></div>
                  <div className="col-span-2 sm:col-span-1 pt-0 sm:pt-5 flex sm:block items-center"><button onClick={()=>delFacility(i)} className="text-red-400 text-sm hover:text-red-300">✕ Remove</button></div>
                </div>
                {fc.photo&&<img src={fc.photo} alt="" className="mt-2 h-16 rounded object-cover w-full" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Spaces ── */}
      {tab==="spaces"&&(
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold" style={{color:"var(--text)"}}>Bookable Spaces</p>
            <button onClick={addSpace} className="text-xs px-3 py-1.5 rounded-lg" style={{background:"var(--s2)",border:"1px solid var(--border)",color:"var(--text)"}}>+ Add Space</button>
          </div>
          <div className="space-y-4">
            {f.spaces.map((sp,i)=>(
              <div key={i} className="rounded-lg p-4" style={{background:"var(--s2)",border:"1px solid var(--border)"}}>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-semibold" style={{color:"var(--text)"}}>{sp.name||`Space ${i+1}`}</p>
                  <button onClick={()=>delSpace(i)} className="text-xs text-red-400 hover:text-red-300">✕ Remove</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <FL label="Space Name"><VI value={sp.name} onChange={v=>updSpace(i,"name",v)} placeholder="e.g. Grand Ballroom"/></FL>
                  <FL label="Capacity"><VI value={sp.capacity} onChange={v=>updSpace(i,"capacity",v)} placeholder="e.g. Up to 800 guests"/></FL>
                  <FL label="Starting Rate"><VI value={sp.rateFrom} onChange={v=>updSpace(i,"rateFrom",v)} placeholder="e.g. ₹1,50,000"/></FL>
                  <FL label="Cover Photo URL"><VI value={sp.photo} onChange={v=>updSpace(i,"photo",v)} placeholder="https://...jpg"/></FL>
                </div>
                <FL label="Description">
                  <textarea value={sp.desc} onChange={e=>updSpace(i,"desc",e.target.value)} rows={2} className="v-input resize-none" placeholder="Describe this space..."/>
                </FL>
                {sp.photo&&<img src={sp.photo} alt="" className="mt-2 rounded-lg w-full h-24 object-cover" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Contact & Social ── */}
      {tab==="contact"&&(
        <Card className="p-6 space-y-4">
          <p className="font-semibold" style={{color:"var(--text)"}}>Social Media & Maps</p>
          <div className="grid grid-cols-1 gap-4">
            <FL label="Instagram URL"><VI value={f.instagram} onChange={v=>upd("instagram",v)} placeholder="https://instagram.com/yourvenue"/></FL>
            <FL label="Facebook URL"><VI value={f.facebook} onChange={v=>upd("facebook",v)} placeholder="https://facebook.com/yourvenue"/></FL>
            <FL label="Google Maps URL"><VI value={f.googleMapsUrl} onChange={v=>upd("googleMapsUrl",v)} placeholder="https://maps.google.com/?q=..."/></FL>
          </div>
          <div className="rounded-lg p-4 text-sm" style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.3)",color:"#10b981"}}>
            ✓ All fields are optional. Only fields with values will be shown on the public portal website.
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC PORTAL WEBSITE (uses VenueConfig)
// ═══════════════════════════════════════════════════════════════

function PortalView({onBook,vc}:{onBook:(d:number)=>void;vc:VenueConfig}){
  const available=Array.from({length:30},(_,i)=>i+1).filter(d=>!BOOKED_DAYS.has(d)&&!EXTERNAL_DAYS.has(d));
  const partial  =Array.from({length:30},(_,i)=>i+1).filter(d=>BOOKED_DAYS.has(d)&&!EXTERNAL_DAYS.has(d));
  const allDays  =Array.from({length:30},(_,i)=>i+1);
  const [imgIdx,setImgIdx]=useState(0);
  const [copied,setCopied]=useState(false);
  const link="http://localhost:3000?view=portal&property=grand-palace";

  const getDayStatus=(d:number)=>{
    if(BOOKED_DAYS.has(d)&&EXTERNAL_DAYS.has(d))return"full";
    if(BOOKED_DAYS.has(d))return"partial";
    if(EXTERNAL_DAYS.has(d))return"ext";
    return"avail";
  };
  const dayStyle=(s:string)=>{
    if(s==="full")   return{bg:"#fef2f2",color:"#ef4444",border:"#fca5a5"};
    if(s==="partial")return{bg:"#fffbeb",color:"#f59e0b",border:"#fcd34d"};
    if(s==="ext")    return{bg:"#fdf4ff",color:"#a855f7",border:"#d8b4fe"};
    return{bg:"#f0fdf4",color:"#16a34a",border:"#86efac"};
  };

  return(
    <div className="animate-slide-in" style={{fontFamily:"system-ui,sans-serif"}}>
      {/* Admin preview banner */}
      <div className="rounded-xl mb-4 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between" style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)"}}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{color:"#f59e0b"}}>👁 Admin Preview</span>
          <span className="text-xs hidden sm:inline" style={{color:"var(--muted)"}}>This is how your public portal looks to clients</span>
        </div>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono px-2 py-1 rounded hidden md:inline" style={{background:"var(--s2)",color:"#f59e0b",border:"1px solid var(--border)"}}>{link}</code>
          <button onClick={()=>{try{navigator.clipboard.writeText(link);}catch{}setCopied(true);setTimeout(()=>setCopied(false),2000);}} className="text-xs px-3 py-1 rounded font-medium" style={{background:"#f59e0b",color:"#000"}}>{copied?"✓ Copied":"Copy Link"}</button>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="rounded-2xl overflow-hidden mb-6 relative" style={{minHeight:360}}>
        {vc.coverPhotoUrl
          ? <img src={vc.coverPhotoUrl} alt={vc.name} className="w-full object-cover" style={{height:360}}/>
          : <div className="w-full flex items-center justify-center" style={{height:360,background:"linear-gradient(135deg,#0d0d14,#1c1c26)"}}><span className="text-6xl">🏛️</span></div>
        }
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8" style={{background:"linear-gradient(0deg,rgba(0,0,0,0.75) 0%,transparent 60%)"}}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              {vc.logoUrl&&<img src={vc.logoUrl} alt="logo" className="h-10 sm:h-12 mb-2 sm:mb-3 object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}
              <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">{vc.name}</h1>
              <p className="text-white/80 text-sm sm:text-lg mt-1">{vc.tagline}</p>
              <p className="text-white/60 text-xs sm:text-sm mt-1">📍 {vc.addressLine1}, {vc.city}, {vc.state}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <a href={`tel:${vc.phone}`} className="px-3 sm:px-4 py-2 rounded-xl font-semibold text-black text-sm" style={{background:"#f59e0b"}}>📞 Call</a>
              {vc.googleMapsUrl&&<a href={vc.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="px-3 sm:px-4 py-2 rounded-xl font-semibold text-sm" style={{background:"rgba(255,255,255,0.2)",color:"white",backdropFilter:"blur(4px)"}}>🗺 Map</a>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Info + Gallery + Facilities + Spaces ── */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          {/* About */}
          {vc.description&&(
            <Card className="p-6">
              <h2 className="font-bold text-lg mb-3" style={{color:"var(--text)"}}>About {vc.name}</h2>
              <p className="text-sm leading-relaxed" style={{color:"var(--muted)"}}>{vc.description}</p>
            </Card>
          )}

          {/* Promo Video */}
          {vc.promoVideoUrl&&(
            <Card className="overflow-hidden">
              <div style={{aspectRatio:"16/9"}}>
                <iframe src={vc.promoVideoUrl} className="w-full h-full" allowFullScreen title="Venue promo"/>
              </div>
            </Card>
          )}

          {/* Gallery */}
          {vc.gallery.filter(Boolean).length>0&&(
            <Card className="p-5">
              <h2 className="font-bold text-base mb-4" style={{color:"var(--text)"}}>Gallery</h2>
              <div className="relative rounded-xl overflow-hidden mb-3" style={{height:240}}>
                <img src={vc.gallery.filter(Boolean)[imgIdx]||""} alt="" className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {vc.gallery.filter(Boolean).map((url,i)=>(
                  <img key={i} src={url} alt="" onClick={()=>setImgIdx(i)} className="h-14 w-20 object-cover rounded-lg cursor-pointer flex-shrink-0 transition-all" style={{opacity:i===imgIdx?1:0.6,outline:i===imgIdx?"2px solid #f59e0b":"none"}} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                ))}
              </div>
            </Card>
          )}

          {/* Facilities */}
          {vc.facilities.filter(f=>f.name).length>0&&(
            <Card className="p-6">
              <h2 className="font-bold text-base mb-4" style={{color:"var(--text)"}}>Facilities & Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {vc.facilities.filter(f=>f.name).map((fc,i)=>(
                  <div key={i} className="rounded-xl p-3 text-center" style={{background:"var(--s2)",border:"1px solid var(--border)"}}>
                    {fc.photo&&<img src={fc.photo} alt="" className="w-full h-16 object-cover rounded-lg mb-2" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}
                    <p className="text-2xl mb-1">{fc.icon}</p>
                    <p className="text-xs font-semibold" style={{color:"var(--text)"}}>{fc.name}</p>
                    {fc.desc&&<p className="text-[11px] mt-0.5" style={{color:"var(--subtle)"}}>{fc.desc}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Spaces */}
          {vc.spaces.filter(s=>s.name).length>0&&(
            <Card className="p-6">
              <h2 className="font-bold text-base mb-4" style={{color:"var(--text)"}}>Our Spaces</h2>
              <div className="space-y-4">
                {vc.spaces.filter(s=>s.name).map((sp,i)=>(
                  <div key={i} className="rounded-xl overflow-hidden" style={{border:"1px solid var(--border)"}}>
                    {sp.photo&&<img src={sp.photo} alt={sp.name} className="w-full h-36 object-cover" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <p className="font-bold" style={{color:"var(--text)"}}>{sp.name}</p>
                        <p className="text-sm mt-0.5" style={{color:"var(--muted)"}}>{sp.desc}</p>
                        <p className="text-xs mt-1" style={{color:"var(--subtle)"}}>👥 {sp.capacity}</p>
                      </div>
                      <div className="sm:text-right flex-shrink-0">
                        <p className="font-bold" style={{color:"#f59e0b"}}>{sp.rateFrom}</p>
                        <p className="text-xs" style={{color:"var(--subtle)"}}>per event</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── Right: Availability + Contact ── */}
        <div className="space-y-4">
          {/* Availability Calendar */}
          <Card className="p-4">
            <h2 className="font-bold text-base mb-3" style={{color:"var(--text)"}}>📅 Check Availability</h2>
            <p className="text-xs mb-3" style={{color:"var(--muted)"}}>June 2025 — Click a green date to request a booking</p>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-3 text-[10px]">
              {[{c:"#16a34a",l:"Available"},{c:"#f59e0b",l:"Partial"},{c:"#ef4444",l:"Full"}].map(x=><div key={x.l} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{background:x.c}}/><span style={{color:"var(--muted)"}}>{x.l}</span></div>)}
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} className="text-center text-[10px] font-semibold py-1" style={{color:"var(--subtle)"}}>{d}</div>)}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {allDays.map(d=>{
                const s=getDayStatus(d);
                const st=dayStyle(s);
                const isAvail=s==="avail"||s==="partial";
                return(
                  <button key={d} onClick={()=>isAvail&&onBook(d)} disabled={!isAvail}
                    className={`rounded text-[11px] font-semibold py-1.5 transition-all ${isAvail?"hover:scale-110 hover:shadow-sm cursor-pointer":"cursor-not-allowed opacity-70"}`}
                    style={{background:st.bg,color:st.color,border:`1px solid ${st.border}`}}>
                    {d}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Quick contact */}
          <Card className="p-4">
            <h2 className="font-bold text-sm mb-3" style={{color:"var(--text)"}}>📞 Contact Us</h2>
            <div className="space-y-2 text-sm">
              {vc.phone&&<a href={`tel:${vc.phone}`} className="flex items-center gap-2 p-2 rounded-lg transition-colors" style={{background:"rgba(245,158,11,0.08)"}}>
                <span>📞</span><span style={{color:"#f59e0b",fontWeight:500}}>{vc.phone}</span>
              </a>}
              {vc.email&&<a href={`mailto:${vc.email}`} className="flex items-center gap-2 p-2 rounded-lg transition-colors" style={{background:"var(--s2)"}}>
                <span>✉️</span><span style={{color:"var(--muted)",fontSize:"12px"}}>{vc.email}</span>
              </a>}
              {vc.website&&<a href={vc.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg" style={{background:"var(--s2)"}}>
                <span>🌐</span><span style={{color:"var(--muted)",fontSize:"12px"}}>{vc.website}</span>
              </a>}
            </div>
          </Card>

          {/* Social */}
          {(vc.instagram||vc.facebook||vc.googleMapsUrl)&&(
            <Card className="p-4">
              <h2 className="font-bold text-sm mb-3" style={{color:"var(--text)"}}>🔗 Follow Us</h2>
              <div className="flex flex-col gap-2">
                {vc.instagram&&<a href={vc.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm p-2 rounded-lg" style={{background:"rgba(236,72,153,0.1)",color:"#ec4899"}}>📸 Instagram</a>}
                {vc.facebook&&<a href={vc.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm p-2 rounded-lg" style={{background:"rgba(59,130,246,0.1)",color:"#3b82f6"}}>👍 Facebook</a>}
                {vc.googleMapsUrl&&<a href={vc.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm p-2 rounded-lg" style={{background:"rgba(239,68,68,0.1)",color:"#ef4444"}}>🗺 Google Maps</a>}
              </div>
            </Card>
          )}

          <p className="text-[10px] text-center" style={{color:"var(--subtle)"}}>Powered by VenueOS · {vc.name}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════

const DEMO_USERS = [
  { email:"admin@grandpalace.in",   password:"admin123",  role:"SUPER_ADMIN",    name:"Arjun Mehta",    desc:"Full access — all properties & settings"   },
  { email:"sales@grandpalace.in",   password:"sales123",  role:"SALES_MANAGER",  name:"Sneha Reddy",    desc:"CRM, leads, quotes, invoices, BDE oversight"},
  { email:"bde@grandpalace.in",     password:"bde123",    role:"BDE",            name:"Karan Mehta",    desc:"My leads, pipeline, incentive dashboard"    },
  { email:"ops@grandpalace.in",     password:"ops123",    role:"OPERATIONS",     name:"Vinod Sharma",   desc:"Bookings, staff, vendors, compliance"       },
  { email:"finance@grandpalace.in", password:"finance123",role:"FINANCE",        name:"Meena Joshi",    desc:"Invoices, P&L, GST reports, expenses"       },
];

const FEATURES = [
  { icon:"⚡", title:"Executive Dashboard",    desc:"Real-time KPIs, revenue charts, pipeline funnel across all properties" },
  { icon:"📅", title:"Booking Calendar",       desc:"Visual month calendar with availability, Airbnb sync, and booking request links" },
  { icon:"🎯", title:"Lead & CRM Pipeline",   desc:"Kanban pipeline from enquiry to conversion with full activity history" },
  { icon:"🧾", title:"GST-Compliant Invoices",desc:"Tax invoices with CGST/SGST auto-calc, SAC codes, PDF export — Karnataka ready" },
  { icon:"💸", title:"Expense Monitor",       desc:"Category-wise monthly expense breakdown with 6-month trend analysis" },
  { icon:"👷", title:"Staff & Compliance",    desc:"8 staff categories, BGV tracking, photo profiles, add/edit with mobile" },
  { icon:"💰", title:"BDE Incentive Engine",  desc:"Slab-based commission calculator with editable targets and sliders" },
  { icon:"✈️", title:"Airbnb / iCal Sync",    desc:"Two-way sync with external calendars, auto-blocking internal slots" },
  { icon:"🌐", title:"Public Booking Portal", desc:"Shareable venue website with gallery, facilities, and OTP booking request" },
  { icon:"⚙️", title:"Venue Configuration",  desc:"Full venue profile — photos, video, spaces, facilities, social links" },
];

function LoginPage({theme,toggleTheme,onLoginSuccess}:{theme:string;toggleTheme:()=>void;onLoginSuccess:()=>void}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [showPw,setShowPw]=useState(false);

  const tryLogin=async()=>{
    if(!email||!password)return;
    setErr(""); setLoading(true);
    try{
      const res=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email.trim().toLowerCase(),password})});
      if(res.ok){ onLoginSuccess(); }
      else{ setErr("Invalid email or password. Use the demo credentials below."); }
    }catch(e){ setErr("Network error. Please try again."); }
    setLoading(false);
  };

  const quickLogin=(u:typeof DEMO_USERS[0])=>{setEmail(u.email);setPassword(u.password);setErr("");};

  return(
    <div data-theme={theme} className="min-h-screen flex" style={{background:"var(--bg)"}}>
      {/* ── Left panel: branding + features ── */}
      <div className="hidden lg:flex flex-col w-[52%] relative overflow-hidden" style={{background:"linear-gradient(160deg,#0a0a0f 0%,#13131a 60%,#1c1c26 100%)"}}>
        {/* Decorative gold blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full opacity-10" style={{background:"radial-gradient(circle,#f59e0b,transparent)"}}/>
        <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full opacity-10" style={{background:"radial-gradient(circle,#f97316,transparent)"}}/>

        <div className="relative z-10 p-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg text-black" style={{background:"#f59e0b"}}>V</div>
            <div>
              <div className="font-black text-xl leading-none" style={{color:"#ffffff"}}>VenueOS</div>
              <div className="text-xs mt-0.5" style={{color:"#64748b"}}>Enterprise Venue Operations</div>
            </div>
          </div>

          <h2 className="text-3xl font-black leading-tight mb-2" style={{color:"#ffffff"}}>
            Everything you need to<br/>run a world-class venue.
          </h2>
          <p className="mb-8" style={{color:"#64748b",fontSize:"15px"}}>
            Multi-property operations, GST-compliant billing, staff compliance, and automated client workflows — all in one platform.
          </p>

          {/* Feature list */}
          <div className="grid grid-cols-2 gap-3 flex-1 content-start">
            {FEATURES.map(f=>(
              <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}>
                <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="font-semibold text-xs leading-tight" style={{color:"#ffffff"}}>{f.title}</p>
                  <p className="text-[11px] mt-0.5 leading-snug" style={{color:"#64748b"}}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div className="flex gap-6 mt-8 pt-6" style={{borderTop:"1px solid rgba(255,255,255,0.08)"}}>
            {[["10+","Modules"],["GST","Compliant"],["iCal","Synced"],["OTP","Verified"]].map(([v,l])=>(
              <div key={l}>
                <p className="font-black text-lg" style={{color:"#f59e0b"}}>{v}</p>
                <p className="text-xs" style={{color:"#64748b"}}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10" style={{background:"var(--bg)"}}>
        {/* Theme toggle top-right */}
        <div className="absolute top-4 right-4">
          <button onClick={toggleTheme} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{background:"var(--s1)",border:"1px solid var(--border)",color:"var(--text)"}}>
            {theme==="dark"?"☀️ Light":"🌙 Dark"}
          </button>
        </div>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg text-black" style={{background:"#f59e0b"}}>V</div>
            <div className="font-black text-xl leading-none" style={{color:"var(--text)"}}>VenueOS</div>
          </div>

          <h1 className="text-2xl font-black mb-1" style={{color:"var(--text)"}}>Welcome back</h1>
          <p className="text-sm mb-7" style={{color:"var(--muted)"}}>Sign in to your Grand Palace Venues account</p>

          <div className="space-y-4">
            <FL label="Email Address">
              <VI value={email} onChange={setEmail} placeholder="admin@grandpalace.in"/>
            </FL>
            <FL label="Password">
              <div className="relative">
                <input value={password} onChange={e=>setPassword(e.target.value)} type={showPw?"text":"password"} placeholder="Enter password" className="v-input pr-10"
                  onKeyDown={e=>e.key==="Enter"&&tryLogin()}/>
                <button onClick={()=>setShowPw(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{color:"var(--subtle)"}}>
                  {showPw?"🙈":"👁"}
                </button>
              </div>
            </FL>
          </div>

          {err&&<p className="mt-3 text-xs text-red-400 text-center">{err}</p>}

          <button onClick={tryLogin} disabled={!email||!password||loading}
            className="w-full mt-5 py-3 font-bold rounded-xl text-black text-sm transition-all disabled:opacity-50"
            style={{background:loading?"#d97706":"#f59e0b"}}>
            {loading?"Signing in...":"Sign In →"}
          </button>

          {/* Demo credentials */}
          <div className="mt-6 rounded-xl overflow-hidden" style={{border:"1px solid var(--border)"}}>
            <div className="px-4 py-2.5 text-xs font-semibold" style={{background:"var(--s2)",borderBottom:"1px solid var(--border)",color:"var(--muted)"}}>
              🔑 Demo Credentials — click to auto-fill
            </div>
            {DEMO_USERS.map(u=>(
              <button key={u.email} onClick={()=>quickLogin(u)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-500/5"
                style={{borderBottom:"1px solid var(--border)"}}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black flex-shrink-0"
                  style={{background:`linear-gradient(135deg,#f59e0b,#f97316)`}}>
                  {u.name.split(" ").map(x=>x[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{color:"var(--text)"}}>{u.name}</p>
                  <p className="text-[11px] truncate" style={{color:"var(--subtle)"}}>{u.email} · {u.password}</p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{background:"rgba(245,158,11,0.15)",color:"#f59e0b"}}>
                  {u.role.replace("_"," ")}
                </span>
              </button>
            ))}
          </div>

          <p className="text-center text-xs mt-6" style={{color:"var(--subtle)"}}>VenueOS v3.0 · Grand Palace Venues Pvt. Ltd.</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════════════════

const NAV=[
  {icon:"⚡",label:"Dashboard",       id:"dashboard"},
  {icon:"📅",label:"Calendar",        id:"calendar"},
  {icon:"📋",label:"Bookings",        id:"bookings"},
  {icon:"✈️",label:"Airbnb/Ext.",     id:"external"},
  {icon:"🎯",label:"Leads & CRM",     id:"leads"},
  {icon:"🧾",label:"Invoices",        id:"invoices"},
  {icon:"💸",label:"Expenses",        id:"expenses"},
  {icon:"👷",label:"Staff",           id:"staff"},
  {icon:"💰",label:"BDE",             id:"bde"},
  {icon:"🌐",label:"Public Portal",   id:"portal"},
  {icon:"⚙️",label:"Venue Settings",  id:"settings"},
];

export default function App(){
  const qcRoot=useQueryClient();
  const {data:me,isLoading:meLoading}=useQuery({queryKey:["me"],queryFn:()=>fetch("/api/me").then(r=>r.json()),retry:false,staleTime:60000});
  const [active,setActive]=useState("dashboard");
  const [bookReq,setBookReq]=useState<number|null>(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [theme,setTheme]     = useLocalStorage<"dark"|"light">("vos-theme","light");
  const [venueConfig,setVenueConfig] = useLocalStorage<VenueConfig>("vos-venue",DEFAULT_VENUE);
  const {data:apiSettings}=useQuery({queryKey:["settings"],queryFn:()=>fetch("/api/settings").then(r=>r.json()),enabled:!!me});
  const vc=apiSettings?{...DEFAULT_VENUE,...apiSettings}:venueConfig;

  const logout=async()=>{await fetch("/api/logout",{method:"POST"});qcRoot.setQueryData(["me"],null);setActive("dashboard");};

  if(meLoading){
    return <div className="min-h-screen flex items-center justify-center" style={{background:"#0a0a0f"}}><div className="text-amber-500 text-2xl animate-pulse">⚡ VenueOS</div></div>;
  }

  if(!me){
    return <LoginPage theme={theme} toggleTheme={()=>setTheme((t:string)=>t==="dark"?"light":"dark")} onLoginSuccess={()=>qcRoot.invalidateQueries({queryKey:["me"]})}/>;
  }

  const authUser={
    email:me.email||"",
    name:me.name||"",
    role:me.role||"VIEWER",
    desc:"",password:"",
  };

  const ROLE_ACCESS: Record<string,string[]> = {
    SUPER_ADMIN:    ["dashboard","calendar","bookings","external","leads","invoices","expenses","staff","bde","portal","settings"],
    PROPERTY_ADMIN: ["dashboard","calendar","bookings","external","leads","invoices","expenses","staff","bde","portal","settings"],
    SALES_MANAGER:  ["dashboard","calendar","bookings","leads","invoices","expenses"],
    BDE:            ["dashboard","calendar","bookings","leads"],
    OPERATIONS:     ["dashboard","calendar","bookings","external","staff"],
    FINANCE:        ["dashboard","invoices","expenses","bde"],
    VIEWER:         ["dashboard","calendar","bookings"],
  };
  const allowedTabs = ROLE_ACCESS[authUser.role] ?? ["dashboard","calendar","bookings"];
  const filteredNav = NAV.filter(n => allowedTabs.includes(n.id));

  const views:Record<string,React.ReactNode>={
    dashboard:<Dashboard/>,
    calendar:<CalendarView onBook={setBookReq}/>,
    bookings:<BookingsView/>,
    external:<ExternalView/>,
    leads:<LeadsView/>,
    invoices:<InvoicesView/>,
    expenses:<ExpensesView/>,
    staff:<StaffView/>,
    bde:<BdeView/>,
    portal:<PortalView onBook={setBookReq} vc={vc}/>,
    settings:<VenueSettingsView config={vc} onSave={setVenueConfig}/>,
  };

  return(
    <div data-theme={theme} className="flex h-screen overflow-hidden relative" style={{background:"var(--bg)",color:"var(--text)"}}>
      {bookReq&&<BookingModal date={bookReq} onClose={()=>setBookReq(null)}/>}
      {sidebarOpen&&<div className="fixed inset-0 z-30 lg:hidden" style={{background:"rgba(0,0,0,0.5)"}} onClick={()=>setSidebarOpen(false)}/>}

      {/* Sidebar */}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-40 w-52 flex-shrink-0 flex flex-col transition-transform duration-200 ${sidebarOpen?"translate-x-0":"-translate-x-full lg:translate-x-0"}`} style={{background:"var(--s0)",borderRight:"1px solid var(--border)"}}>
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2.5" style={{borderBottom:"1px solid var(--border)"}}>
          {venueConfig.logoUrl
            ? <img src={venueConfig.logoUrl} className="w-8 h-8 rounded-lg object-cover" alt="logo" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
            : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-black text-sm" style={{background:"#f59e0b"}}>V</div>
          }
          <div>
            <div className="font-bold text-sm leading-none truncate" style={{color:"var(--text)",maxWidth:"112px"}}>{venueConfig.name||"VenueOS"}</div>
            <div className="text-xs mt-0.5 truncate" style={{color:"var(--subtle)",maxWidth:"112px"}}>{authUser.role.replace("_"," ")}</div>
          </div>
        </div>
        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {filteredNav.map(n=>(
            <button key={n.id} onClick={()=>{setActive(n.id);setSidebarOpen(false);}} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all"
              style={{background:active===n.id?"rgba(245,158,11,0.12)":"transparent",color:active===n.id?"#f59e0b":"var(--muted)",fontWeight:active===n.id?500:400,fontSize:"13px"}}>
              <span className="text-base leading-none">{n.icon}</span>
              <span className="truncate">{n.label}</span>
              {active===n.id&&<div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:"#f59e0b"}}/>}
            </button>
          ))}
        </nav>
        {/* User */}
        <div className="px-3 py-3" style={{borderTop:"1px solid var(--border)"}}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-black" style={{background:"linear-gradient(135deg,#f59e0b,#f97316)"}}>
              {authUser.name.split(" ").map((x:string)=>x[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{color:"var(--text)"}}>{authUser.name}</p>
              <p className="text-[10px] truncate" style={{color:"var(--subtle)"}}>{authUser.role.replace(/_/g," ")}</p>
            </div>
            <button onClick={logout} title="Sign out" className="text-xs rounded px-1.5 py-1 transition-colors" style={{color:"var(--subtle)"}} onMouseEnter={e=>(e.currentTarget.style.color="#ef4444")} onMouseLeave={e=>(e.currentTarget.style.color="var(--subtle)")}>
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 flex-shrink-0" style={{minHeight:"52px",background:"var(--s0)",borderBottom:"1px solid var(--border)"}}>
          <div className="flex items-center gap-2 text-sm" style={{color:"var(--muted)"}}>
            <button className="lg:hidden mr-1 text-lg leading-none" onClick={()=>setSidebarOpen(p=>!p)} style={{color:"var(--text)"}}>☰</button>
            <span className="hidden sm:inline">VenueOS</span>
            <span className="hidden sm:inline" style={{color:"var(--border)"}}>/</span>
            <span style={{color:"var(--text)"}}>{NAV.find(n=>n.id===active)?.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs px-2.5 py-1 rounded-full font-medium badge-confirmed">● Live Demo</span>
            <span className="hidden md:inline text-xs" style={{color:"var(--subtle)"}}>KA · GST:29</span>
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{background:"var(--s2)",border:"1px solid var(--border)",color:"var(--text)"}}>
              {theme==="dark"?"☀️ Light":"🌙 Dark"}
            </button>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5">{views[active]}</main>
      </div>
    </div>
  );
}
