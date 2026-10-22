const defaultServices = [
  {
    code: "01",
    title: "Digital Infrastructure",
    copy: "Resilient networks, cloud foundations, data centers, and managed infrastructure engineered for continuous operations.",
    tags: ["Cloud", "Networks", "Data centers"],
    accent: "Infrastructure uptime",
    metric: "99.99%",
  },
  {
    code: "02",
    title: "Enterprise Software",
    copy: "Connected business platforms, custom applications, and integrations that turn complex operations into clear decisions.",
    tags: ["ERP", "Web & mobile", "Integration"],
    accent: "Faster delivery",
    metric: "3.4×",
  },
  {
    code: "03",
    title: "Cyber Security",
    copy: "Risk-led security architecture, active monitoring, and practical governance that protect every layer of your enterprise.",
    tags: ["SOC", "IAM", "Compliance"],
    accent: "Threat coverage",
    metric: "24/7",
  },
  {
    code: "04",
    title: "Engineering Solutions",
    copy: "Integrated electrical, electromechanical, and smart-building systems delivered from design through commissioning.",
    tags: ["Smart systems", "Power", "Automation"],
    accent: "One accountable team",
    metric: "360°",
  },
];

const defaultProjects = [
  { sector: "Financial Services", title: "National resilient network modernization", result: "42% lower latency", className: "project-blue" },
  { sector: "Public Infrastructure", title: "Smart operations command platform", result: "18 sites unified", className: "project-gold" },
  { sector: "Education", title: "Connected campus learning ecosystem", result: "26,000 users", className: "project-deep" },
];


export async function seedPublicContent(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const migration = await client.query("INSERT INTO guba_migrations(id) VALUES ('public-content-v1') ON CONFLICT DO NOTHING RETURNING id");
    if (!migration.rowCount) { await client.query("ROLLBACK"); return; }
    const updated = new Date().toISOString();
    const item = (id,title,detail,fields={}) => ({id,title,detail,fields,updated,status:"Published",extra:""});
    const content = {
      Homepage: [item("guba-hero","Engineering progress.","We unite engineering precision, digital intelligence, and local expertise to create infrastructure and systems that move organizations—and nations—forward.",{placement:"hero",subtitle:"Empowering growth.",image:"/guba-hero-3d.png",years:"15+",projects:"120+",retention:"98%"}),item("guba-about","One partner. Every critical layer.","From the physical layer to the cloud, from strategy to support, GUBA brings every discipline together under one accountable team.",{placement:"about"})],
      Services: defaultServices.map((x,i)=>item("guba-service-"+i,x.title,x.copy,{tags:x.tags.join(", "),metric:x.metric,accent:x.accent})),
      Projects: defaultProjects.map((x,i)=>item("guba-project-"+i,x.title,x.result,{sector:x.sector,result:x.result})),
      Insights: [item("guba-insight-1","Building resilient digital infrastructure for Africa’s next decade","Explore resilient networks, reliable cloud foundations, and integrated delivery with GUBA.",{category:"Insight",readingTime:"8 min read"}),item("guba-insight-2","From perimeter to resilience: a practical security roadmap","Connect security architecture, monitoring and governance to protect your organization.",{category:"Cyber security",readingTime:"6 min read"}),item("guba-insight-3","Why integrated project delivery changes the outcome","Bring technology, engineering and people together under one accountable team.",{category:"Engineering",readingTime:"5 min read"}),item("guba-insight-4","GUBA expands enterprise training partnerships","Contact GUBA Academy to discuss professional training for your team.",{category:"News",readingTime:"3 min read"})],
      "Partners & clients": ["CISCO","Microsoft","ORACLE","FORTINET","Schneider","DELL"].map((x,i)=>item("guba-partner-"+i,x,"Technology ecosystem"))
    };
    for (const [section,items] of Object.entries(content)) {
      const exists = await client.query("SELECT 1 FROM guba_records WHERE section=$1 LIMIT 1",[section]);
      if (exists.rowCount) continue;
      for (const [position,record] of items.entries()) await client.query("INSERT INTO guba_records(section,id,data,position) VALUES ($1,$2,$3::jsonb,$4)",[section,record.id,JSON.stringify(record),position]);
    }
    await client.query("UPDATE guba_workspace SET revision=revision+1 WHERE id='guba'");
    await client.query("INSERT INTO guba_activity(actor,action) VALUES ('System','Connected existing website content to the admin dashboard')");
    await client.query("COMMIT");
    console.log("Existing website content is now editable in the admin dashboard.");
  } catch(error) {await client.query("ROLLBACK");throw error;} finally {client.release();}
}

export async function seedContactPage(pool) {
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const migration=await client.query("INSERT INTO guba_migrations(id) VALUES ('contact-page-v1') ON CONFLICT DO NOTHING RETURNING id");
    if (!migration.rowCount) {await client.query("ROLLBACK");return;}
    const existing=await client.query("SELECT 1 FROM guba_records WHERE section='Contact information' LIMIT 1");
    if(!existing.rowCount) {
      const item={id:"guba-contact-main",title:"Let’s build what’s next.",detail:"A project to discuss. A question to explore. A partnership to build. Tell us what you have in mind, and let’s find the right way forward.",status:"Published",updated:new Date().toISOString(),fields:{},extra:""};
      await client.query("INSERT INTO guba_records(section,id,data,position) VALUES ('Contact information',$1,$2::jsonb,0)",[item.id,JSON.stringify(item)]);
      await client.query("UPDATE guba_workspace SET revision=revision+1 WHERE id='guba'");
      await client.query("INSERT INTO guba_activity(actor,action) VALUES ('System','Created the editable contact page; office details await administrator input')");
    }
    await client.query("COMMIT");
  } catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
