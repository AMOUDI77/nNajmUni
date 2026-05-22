import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../../data');
const DB_PATH  = path.join(DATA_DIR, 'najmuni.db');

let db: Database;

export async function getDb(): Promise<Database> {
  if (db) return db;
  const SQL = await initSqlJs();
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  return db;
}

export function saveDb(): void {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

export async function initDb(): Promise<void> {
  const db = await getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS universities (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      abbr            TEXT    NOT NULL,
      name            TEXT    NOT NULL,
      type            TEXT    NOT NULL,
      location        TEXT    NOT NULL,
      qs_ranking      INTEGER,
      color           TEXT    NOT NULL DEFAULT '#6D28D9',
      description     TEXT,
      website         TEXT,
      tuition_min     INTEGER,
      tuition_max     INTEGER,
      established     INTEGER,
      students_count  INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS programs (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id    INTEGER NOT NULL,
      name             TEXT    NOT NULL,
      level            TEXT    NOT NULL,
      duration_years   REAL    NOT NULL,
      tuition_per_year INTEGER NOT NULL,
      field            TEXT    NOT NULL,
      description      TEXT,
      intake           TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT NOT NULL,
      name       TEXT,
      source     TEXT DEFAULT 'landing',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const [{ values }] = db.exec('SELECT COUNT(*) as c FROM universities');
  if ((values[0][0] as number) === 0) {
    await seed(db);
  }

  saveDb();
}

async function seed(db: Database): Promise<void> {
  const universities = [
    { abbr: 'UM',        name: 'Universiti Malaya',                type: 'public',         location: 'Kuala Lumpur',          qs_ranking: 65,  color: '#003580', description: "Malaysia's oldest and most prestigious university, consistently ranked #1 in the country with world-class research facilities and a beautiful 309-acre campus.", website: 'https://www.um.edu.my',        tuition_min: 20000, tuition_max: 55000, established: 1949, students_count: 22000 },
    { abbr: 'USM',       name: 'Universiti Sains Malaysia',        type: 'public',         location: 'Penang',                qs_ranking: 134, color: '#00539C', description: "A top-tier research university with strengths in science and technology, situated on scenic Penang island — one of Malaysia's most vibrant cities.", website: 'https://www.usm.my',          tuition_min: 18000, tuition_max: 45000, established: 1969, students_count: 28000 },
    { abbr: 'UPM',       name: 'Universiti Putra Malaysia',        type: 'public',         location: 'Serdang, Selangor',     qs_ranking: 130, color: '#006633', description: 'A comprehensive research university globally recognised for agriculture, environmental sciences, and engineering.', website: 'https://www.upm.edu.my',      tuition_min: 18000, tuition_max: 42000, established: 1971, students_count: 27000 },
    { abbr: 'UTM',       name: 'Universiti Teknologi Malaysia',    type: 'public',         location: 'Johor Bahru',           qs_ranking: 189, color: '#003087', description: "Malaysia's leading engineering and technology university with campuses in Johor Bahru and Kuala Lumpur.", website: 'https://www.utm.my',          tuition_min: 17000, tuition_max: 40000, established: 1904, students_count: 27000 },
    { abbr: 'UKM',       name: 'Universiti Kebangsaan Malaysia',   type: 'public',         location: 'Bangi, Selangor',       qs_ranking: 163, color: '#800020', description: "Malaysia's national university, renowned for its medical faculty, law school, and strong research output across all disciplines.", website: 'https://www.ukm.my',          tuition_min: 18000, tuition_max: 50000, established: 1970, students_count: 27000 },
    { abbr: 'UITM',      name: 'Universiti Teknologi MARA',        type: 'public',         location: 'Shah Alam, Selangor',   qs_ranking: null, color: '#8B0000', description: "Malaysia's largest university with 35+ campuses nationwide, offering a wide range of programmes.", website: 'https://www.uitm.edu.my',     tuition_min: 8000,  tuition_max: 25000, established: 1956, students_count: 170000 },
    { abbr: 'MMU',       name: 'Multimedia University',            type: 'private',        location: 'Cyberjaya',             qs_ranking: null, color: '#1A4FA0', description: "Malaysia's first private university, specialising in technology, engineering, and creative multimedia in the heart of the Multimedia Super Corridor.", website: 'https://www.mmu.edu.my',      tuition_min: 22000, tuition_max: 38000, established: 1999, students_count: 14000 },
    { abbr: 'APU',       name: 'Asia Pacific University',          type: 'private',        location: 'Kuala Lumpur',          qs_ranking: null, color: '#C8102E', description: 'A top private tech-focused university with strong industry links, offering UK-validated degrees and an international student community from 130+ countries.', website: 'https://www.apu.edu.my',      tuition_min: 24000, tuition_max: 42000, established: 1993, students_count: 14000 },
    { abbr: 'UTAR',      name: 'Universiti Tunku Abdul Rahman',    type: 'private',        location: 'Kampar, Perak',         qs_ranking: null, color: '#E31837', description: 'A non-profit private university offering affordable quality education, consistently ranked among the top private institutions.', website: 'https://www.utar.edu.my',     tuition_min: 15000, tuition_max: 32000, established: 2002, students_count: 22000 },
    { abbr: "TAYLOR'S",  name: "Taylor's University",              type: 'private',        location: 'Subang Jaya, Selangor', qs_ranking: null, color: '#1B3A6B', description: 'Ranked among the top 3 private universities in Malaysia, well-known for hospitality, law, business, and its American Degree Transfer Program.', website: 'https://www.taylors.edu.my',  tuition_min: 28000, tuition_max: 55000, established: 1969, students_count: 17000 },
    { abbr: 'SUNWAY',    name: 'Sunway University',                type: 'private',        location: 'Subang Jaya, Selangor', qs_ranking: null, color: '#E87722', description: 'A leading private university with global partnerships (Lancaster University, UC) and strong programmes in business, medicine, and the arts.', website: 'https://www.sunway.edu.my',   tuition_min: 25000, tuition_max: 50000, established: 1987, students_count: 10000 },
    { abbr: 'UNITAR',    name: 'UNITAR International University',  type: 'private',        location: 'Kelana Jaya, Selangor', qs_ranking: null, color: '#6D28D9', description: "Malaysia's first fully online university offering flexible learning options and strong post-graduate programmes for working professionals.", website: 'https://www.unitar.my',       tuition_min: 12000, tuition_max: 28000, established: 1997, students_count: 8000 },
    { abbr: 'HWU',       name: 'Heriot-Watt University Malaysia',  type: 'foreign_branch', location: 'Putrajaya',             qs_ranking: 301, color: '#7B1FA2', description: "The Malaysian campus of Scotland's prestigious Heriot-Watt University — same UK degree at a fraction of Edinburgh's cost.", website: 'https://www.hw.ac.uk/malaysia', tuition_min: 35000, tuition_max: 60000, established: 2014, students_count: 4000 },
    { abbr: 'INTI',      name: 'INTI International University',    type: 'private',        location: 'Nilai, Negeri Sembilan', qs_ranking: null, color: '#D32F2F', description: 'Part of the Laureate International Universities network, offering dual-award degrees with partners in Australia, UK, and the US.', website: 'https://www.newinti.edu.my',  tuition_min: 18000, tuition_max: 40000, established: 1986, students_count: 15000 },
    { abbr: 'HELP',      name: 'HELP University',                  type: 'private',        location: 'Kuala Lumpur',          qs_ranking: null, color: '#1565C0', description: "A well-established private university known for psychology, business, and law, with twinning programmes at prestigious global institutions.", website: 'https://www.help.edu.my',     tuition_min: 18000, tuition_max: 38000, established: 1986, students_count: 7000 },
  ];

  const programs = [
    // UM
    { uni: 'UM',       name: 'Bachelor of Computer Science',             level: 'bachelor', duration_years: 3,   tuition_per_year: 22000, field: 'Technology',    description: 'Comprehensive CS covering AI, systems, networks and software engineering.', intake: 'Feb, Jul' },
    { uni: 'UM',       name: 'Bachelor of Medicine (MBBS)',              level: 'bachelor', duration_years: 5,   tuition_per_year: 52000, field: 'Medicine',      description: "One of Asia's most respected medical degrees, fully accredited by the Malaysian Medical Council.", intake: 'Feb' },
    { uni: 'UM',       name: 'Bachelor of Engineering (Electrical)',     level: 'bachelor', duration_years: 4,   tuition_per_year: 25000, field: 'Engineering',   description: 'Rigorous electrical engineering with strong industry partnerships.', intake: 'Feb, Sep' },
    { uni: 'UM',       name: 'Master of Business Administration',        level: 'master',   duration_years: 1.5, tuition_per_year: 28000, field: 'Business',      description: 'Full-time and part-time MBA for professionals accelerating their careers.', intake: 'Feb, Jul' },
    { uni: 'UM',       name: 'Bachelor of Laws (LLB)',                   level: 'bachelor', duration_years: 3,   tuition_per_year: 24000, field: 'Law',           description: 'Internationally recognised law degree with mooting competitions and a strong alumni network.', intake: 'Feb' },
    // USM
    { uni: 'USM',      name: 'Bachelor of Computer Science',             level: 'bachelor', duration_years: 3,   tuition_per_year: 19000, field: 'Technology',    description: 'Strong foundation in computing with electives in AI, cybersecurity and data science.', intake: 'Feb, Jul' },
    { uni: 'USM',      name: 'Bachelor of Pharmacy',                     level: 'bachelor', duration_years: 4,   tuition_per_year: 26000, field: 'Medicine',      description: 'Fully accredited pharmacy programme recognised across ASEAN and the Middle East.', intake: 'Feb' },
    { uni: 'USM',      name: 'Bachelor of Engineering (Mechanical)',     level: 'bachelor', duration_years: 4,   tuition_per_year: 21000, field: 'Engineering',   description: 'Thermal, manufacturing, and materials streams with modern lab facilities.', intake: 'Feb, Jul' },
    // UPM
    { uni: 'UPM',      name: 'Bachelor of Science (Computer Science)',   level: 'bachelor', duration_years: 4,   tuition_per_year: 19000, field: 'Technology',    description: "Research-oriented CS degree with access to UPM's high-performance computing lab.", intake: 'Sep' },
    { uni: 'UPM',      name: 'Bachelor of Agricultural Science',         level: 'bachelor', duration_years: 4,   tuition_per_year: 18000, field: 'Science',       description: "World-class agri-science programme underpinned by UPM's 1,200-acre working farm.", intake: 'Sep' },
    { uni: 'UPM',      name: 'Doctor of Veterinary Medicine',            level: 'bachelor', duration_years: 5,   tuition_per_year: 30000, field: 'Medicine',      description: 'One of only two veterinary programmes in Malaysia, taught in a dedicated teaching hospital.', intake: 'Sep' },
    // UTM
    { uni: 'UTM',      name: 'Bachelor of Electrical Engineering',       level: 'bachelor', duration_years: 4,   tuition_per_year: 20000, field: 'Engineering',   description: 'Power systems, electronics, and telecommunications streams in a fully equipped lab environment.', intake: 'Feb, Sep' },
    { uni: 'UTM',      name: 'Bachelor of Civil Engineering',            level: 'bachelor', duration_years: 4,   tuition_per_year: 20000, field: 'Engineering',   description: 'Structures, geotechnics, and hydraulics — shaping the infrastructure of tomorrow.', intake: 'Feb, Sep' },
    { uni: 'UTM',      name: 'Master of Science (Data Science)',         level: 'master',   duration_years: 1.5, tuition_per_year: 22000, field: 'Technology',    description: "Industry-driven data science master's with machine learning, big data and analytics.", intake: 'Feb, Sep' },
    // UKM
    { uni: 'UKM',      name: 'Bachelor of Medicine (MBBS)',              level: 'bachelor', duration_years: 5,   tuition_per_year: 48000, field: 'Medicine',      description: 'UKM Medical Faculty is one of the most respected in Southeast Asia, with a teaching hospital on campus.', intake: 'Feb' },
    { uni: 'UKM',      name: 'Bachelor of Laws (LLB)',                   level: 'bachelor', duration_years: 3,   tuition_per_year: 22000, field: 'Law',           description: 'Nationally recognised law degree with a strong focus on Malaysian and Islamic law.', intake: 'Feb, Sep' },
    // MMU
    { uni: 'MMU',      name: 'Bachelor of Computer Science (AI)',        level: 'bachelor', duration_years: 3,   tuition_per_year: 24000, field: 'Technology',    description: 'Specialised AI curriculum with deep learning, computer vision, and NLP modules.', intake: 'Feb, Jul, Sep' },
    { uni: 'MMU',      name: 'Bachelor of Multimedia Design',            level: 'bachelor', duration_years: 3,   tuition_per_year: 23000, field: 'Arts & Design', description: 'Creative programme blending graphic design, motion graphics, UX and digital storytelling.', intake: 'Feb, Jul, Sep' },
    { uni: 'MMU',      name: 'Bachelor of Game Development',             level: 'bachelor', duration_years: 3,   tuition_per_year: 24000, field: 'Technology',    description: 'End-to-end game development from concept to engine programming — Unity and Unreal.', intake: 'Feb, Jul' },
    // APU
    { uni: 'APU',      name: 'Bachelor of Software Engineering',         level: 'bachelor', duration_years: 3,   tuition_per_year: 26000, field: 'Technology',    description: 'UK-validated degree with agile methodology, DevOps, and enterprise software tracks.', intake: 'Feb, Jul, Sep' },
    { uni: 'APU',      name: 'Bachelor of Cybersecurity',               level: 'bachelor', duration_years: 3,   tuition_per_year: 27000, field: 'Technology',    description: 'Hands-on ethical hacking, network security, and digital forensics in purpose-built cyber labs.', intake: 'Feb, Jul, Sep' },
    { uni: 'APU',      name: 'Bachelor of Business Management',          level: 'bachelor', duration_years: 3,   tuition_per_year: 24000, field: 'Business',      description: 'International business management with a compulsory industry placement semester.', intake: 'Feb, Jul, Sep' },
    // UTAR
    { uni: 'UTAR',     name: 'Bachelor of Computer Science',             level: 'bachelor', duration_years: 3,   tuition_per_year: 16000, field: 'Technology',    description: "Affordable, high-quality CS degree with a strong alumni network in Malaysia's tech industry.", intake: 'Feb, Jun, Oct' },
    { uni: 'UTAR',     name: 'Bachelor of Accounting',                   level: 'bachelor', duration_years: 3,   tuition_per_year: 15000, field: 'Business',      description: 'ACCA and ICAEW-exemption programme preparing students for global accounting careers.', intake: 'Feb, Jun, Oct' },
    // Taylor's
    { uni: "TAYLOR'S", name: 'Bachelor of Culinary Arts',                level: 'bachelor', duration_years: 3,   tuition_per_year: 36000, field: 'Hospitality',   description: "Asia's best culinary arts school with professional kitchens and international chef mentors.", intake: 'Feb, Jul' },
    { uni: "TAYLOR'S", name: 'Bachelor of Laws (LLB)',                   level: 'bachelor', duration_years: 3,   tuition_per_year: 34000, field: 'Law',           description: 'Highly regarded law programme with mooting, internship placements and UK-validated recognition.', intake: 'Feb, Jul' },
    { uni: "TAYLOR'S", name: 'American Degree Transfer Program',         level: 'diploma',  duration_years: 2,   tuition_per_year: 30000, field: 'Business',      description: 'Transfer to top US universities after 2 years in Malaysia.', intake: 'Feb, Jul, Sep' },
    // Sunway
    { uni: 'SUNWAY',   name: 'Bachelor of Business (Accounting)',        level: 'bachelor', duration_years: 3,   tuition_per_year: 28000, field: 'Business',      description: 'Lancaster University-affiliated degree with strong ACCA-exemption pathways.', intake: 'Feb, Jul, Sep' },
    { uni: 'SUNWAY',   name: 'Bachelor of Medicine (MBBS)',              level: 'bachelor', duration_years: 5,   tuition_per_year: 48000, field: 'Medicine',      description: 'A fully accredited medical programme with clinical training at Sunway Medical Centre.', intake: 'Feb' },
    // HWU
    { uni: 'HWU',      name: 'Bachelor of Engineering (Petroleum)',      level: 'bachelor', duration_years: 4,   tuition_per_year: 42000, field: 'Engineering',   description: 'UK degree with strong ties to the oil & gas industry — PETRONAS and Shell partnerships.', intake: 'Feb, Sep' },
    { uni: 'HWU',      name: 'Bachelor of Business Management',          level: 'bachelor', duration_years: 4,   tuition_per_year: 38000, field: 'Business',      description: "Same Heriot-Watt UK degree, earned in Malaysia for a fraction of Edinburgh's costs.", intake: 'Feb, Sep' },
    // INTI
    { uni: 'INTI',     name: 'Bachelor of Computer Science',             level: 'bachelor', duration_years: 3,   tuition_per_year: 22000, field: 'Technology',    description: 'Dual-award degree option with Coventry University UK — two degrees for the price of one.', intake: 'Feb, Jul, Sep' },
    { uni: 'INTI',     name: 'Bachelor of Business Administration',      level: 'bachelor', duration_years: 3,   tuition_per_year: 20000, field: 'Business',      description: 'Partnered with Coventry University for regional and international recognition.', intake: 'Feb, Jul, Sep' },
    // HELP
    { uni: 'HELP',     name: 'Bachelor of Psychology',                   level: 'bachelor', duration_years: 3,   tuition_per_year: 22000, field: 'Social Science', description: "HELP is Malaysia's pioneer in psychology education — accredited and industry-connected.", intake: 'Feb, Jul, Sep' },
    { uni: 'HELP',     name: 'Bachelor of Laws (LLB)',                   level: 'bachelor', duration_years: 3,   tuition_per_year: 24000, field: 'Law',           description: 'Twinning options with UK universities and a strong Bar exam pass rate.', intake: 'Feb, Jul' },
  ];

  const uniIdMap: Record<string, number> = {};

  universities.forEach(u => {
    db.run(
      `INSERT INTO universities (abbr,name,type,location,qs_ranking,color,description,website,tuition_min,tuition_max,established,students_count)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [u.abbr, u.name, u.type, u.location, u.qs_ranking ?? null, u.color, u.description, u.website, u.tuition_min, u.tuition_max, u.established, u.students_count]
    );
    const [{ values }] = db.exec('SELECT last_insert_rowid() as id');
    uniIdMap[u.abbr] = values[0][0] as number;
  });

  programs.forEach(p => {
    const uid = uniIdMap[p.uni];
    if (uid) {
      db.run(
        `INSERT INTO programs (university_id,name,level,duration_years,tuition_per_year,field,description,intake)
         VALUES (?,?,?,?,?,?,?,?)`,
        [uid, p.name, p.level, p.duration_years, p.tuition_per_year, p.field, p.description, p.intake]
      );
    }
  });

  console.log(`✅ Seeded ${universities.length} universities and ${programs.length} programs`);
}
