"use client";

import { DeveloperCredit } from "./DeveloperCredit";
import Image from "next/image";
import { type PublicSite, recordPath, safeUrl, imageUrl } from "./public-content";
import { useLiveSite, Maintenance } from "./LiveSite";
import { PartnerLogos } from "./PartnerLogos";
import { PublicCollection } from "./PublicCollection";
import type { SubmissionKind } from "./PublicForm";
import { ContactDialog } from "./ContactDialog";
import { FormEvent, PointerEvent, useEffect, useRef, useState } from "react";

// Temporarily hide Training on the main website; retain its admin content.
const trainingVisible = false;
const nav = ["About", "Services", "Projects", ...(trainingVisible ? ["Training"] : []), "Insights"];

export function GubaExperience({ initialSite }: { initialSite: PublicSite }) {
  const site = useLiveSite(initialSite);
  const content = site.content;
  const hero = content.Homepage?.find(item => item.fields?.placement === "hero");
  const about = content.Homepage?.find(item => item.fields?.placement === "about");
  const services = (content.Services ?? []).map((item, index) => ({ ...item, code: String(index + 1).padStart(2, "0"), title: item.title, copy: item.detail, tags: (item.fields?.tags ?? "").split(",").filter(Boolean), accent: item.fields?.accent || "GUBA capability", metric: item.fields?.metric || "360°" }));
  const projects = (content.Projects ?? []).map((item,index) => ({ ...item, sector: item.fields?.sector || "Engineering", result: item.fields?.result || item.detail, className: ["project-blue", "project-gold", "project-deep"][index % 3] }));
  const heroFrame = useRef<number | null>(null);
  const [activeService, setActiveService] = useState(0);
  const [contactForm, setContactForm] = useState<SubmissionKind | null>(null);
  const academy = content.Homepage?.find(item => item.fields?.placement === "academy");
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    { from: "bot", text: "Welcome to GUBA. How can I help move your organization forward?" },
  ]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {if (event.key === "Escape") setMenuOpen(false);};
    const desktop = window.matchMedia("(min-width: 1101px)");
    const onDesktop = () => {if (desktop.matches) setMenuOpen(false);};
    window.addEventListener("keydown", close); desktop.addEventListener("change", onDesktop);
    return () => {document.body.style.overflow=previous;window.removeEventListener("keydown",close);desktop.removeEventListener("change",onDesktop);};
  }, [menuOpen]);

  useEffect(() => () => {
    if (heroFrame.current !== null) cancelAnimationFrame(heroFrame.current);
  }, []);

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    setMessages((current) => [
      ...current,
      { from: "user", text: q },
      {
        from: "bot",
        text: content["AI knowledge"]?.find(item => item.title.toLowerCase().split(/\s+/).filter(word => word.length > 3).some(word => q.toLowerCase().includes(word)))?.detail || (q.toLowerCase().includes("service") ? (services.length ? "Our services: " + services.map(item => item.title).join(", ") : "Please contact " + site.settings.contactEmail + " to discuss our services.") : q.toLowerCase().includes("training") ? ((content.Training ?? []).length ? "Training programs: " + content.Training!.map(item => item.title).join(", ") : "Contact " + site.settings.contactEmail + " for training availability.") : q.toLowerCase().includes("project") ? (projects.length ? "Our projects: " + projects.map(item => item.title).join(", ") : "Contact our team to discuss project experience.") : q.toLowerCase().includes("quote") ? "Use the Request a quotation form on this page to send your requirements to our team." : "Please contact " + site.settings.contactEmail + " or use our contact form. Our team will help with your request."),
      },
    ]);
    setChatInput("");
  }

  function submitChat(event: FormEvent) {
    event.preventDefault();
    ask(chatInput);
  }

  function moveHero(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
    const hero = event.currentTarget;
    if (heroFrame.current !== null) cancelAnimationFrame(heroFrame.current);
    heroFrame.current = requestAnimationFrame(() => {
      hero.style.setProperty("--hero-shift-x", `${x * -28}px`);
      hero.style.setProperty("--hero-shift-y", `${y * -20}px`);
      hero.style.setProperty("--hero-tilt-x", `${y * -5}deg`);
      hero.style.setProperty("--hero-tilt-y", `${x * 6}deg`);
      hero.style.setProperty("--hero-pointer-x", `${(x + 1) * 50}%`);
      hero.style.setProperty("--hero-pointer-y", `${(y + 1) * 50}%`);
      heroFrame.current = null;
    });
  }

  function resetHero(event: PointerEvent<HTMLElement>) {
    if (heroFrame.current !== null) cancelAnimationFrame(heroFrame.current);
    heroFrame.current = null;
    event.currentTarget.style.setProperty("--hero-shift-x", "0px");
    event.currentTarget.style.setProperty("--hero-shift-y", "0px");
    event.currentTarget.style.setProperty("--hero-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--hero-tilt-y", "0deg");
    event.currentTarget.style.setProperty("--hero-pointer-x", "50%");
    event.currentTarget.style.setProperty("--hero-pointer-y", "50%");
  }

  if (site.settings.maintenance) return <Maintenance site={site} />;
  const selectedService = services[Math.min(activeService, Math.max(services.length - 1, 0))];
  return (
    <main className={hero ? "" : "no-public-hero"}>
      <a className="skip-link" href="#top">Skip to content</a>
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
        <a className="brand" href="#top" aria-label="GUBA home">
          <span className="brand-mark">G</span>
          <span className="brand-copy"><strong>GUBA</strong><small>{site.settings.siteName.replace(/^GUBAs*/i, "")}</small></span>
        </a>
        <nav id="primary-navigation" className={menuOpen ? "nav-open" : ""} aria-label="Primary navigation">
          {nav.map((item) => <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)}>{item}</a>)}
          <a href="/contact" className="nav-contact" onClick={() => setMenuOpen(false)}>Talk to an expert <span>↗</span></a>
        </nav>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="primary-navigation" aria-label="Toggle menu">
          <span /><span />
        </button>
      </header>

      {hero && <section className="hero hero-reference hero-3d" id="top" onPointerMove={moveHero} onPointerLeave={resetHero}>
        {/* eslint-disable-next-line @next/next/no-img-element -- This image is the original 3D hero plane. */}
        <img loading="eager" fetchPriority="high"
          className="hero-reference-image"
          src={safeUrl(hero.fields?.image) || "/guba-hero-3d.png"}
          alt=""
          aria-hidden="true"
        />
        <div className="hero-reference-shade" aria-hidden="true" />
        <div className="hero-cursor-glow" aria-hidden="true" />
        <div className="hero-depth-layers" aria-hidden="true">
          <span className="depth-orbit depth-orbit-one" />
          <span className="depth-orbit depth-orbit-two" />
          <span className="depth-particle particle-a" />
          <span className="depth-particle particle-b" />
          <span className="depth-particle particle-c" />
        </div>
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-orbit orbit-one" aria-hidden="true" />
        <div className="hero-orbit orbit-two" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-content hero-mobile-content" id="main-content">
          <div className="eyebrow"><span /> {site.settings.siteName}</div>
          <h1>{hero.title}<br /><em>{hero.fields?.subtitle}</em></h1>
          <p>{hero.detail}</p>
          <div className="hero-actions">
            <a href="#services" className="button button-gold">Explore our capabilities <span>↗</span></a>
            <a href="#projects" className="button button-ghost"><span className="play">▶</span> See our impact</a>
          </div>
          <div className="hero-proof">
            <div><strong>{hero.fields?.years}</strong><span>Years of engineering<br />excellence</span></div>
            <div><strong>{hero.fields?.projects}</strong><span>Projects delivered<br />across sectors</span></div>
            <div><strong>{hero.fields?.retention}</strong><span>Client partnership<br />retention</span></div>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="core-ring ring-a" />
          <div className="core-ring ring-b" />
          <div className="core-ring ring-c" />
          <div className="core-sphere"><span>G</span></div>
          <div className="data-pill pill-one"><i /> SYSTEMS ONLINE <b>99.99%</b></div>
          <div className="data-pill pill-two"><i /> ETHIOPIA <b>CONNECTED</b></div>
          <div className="float-node node-one" />
          <div className="float-node node-two" />
        </div>
        <div className="scroll-hint"><span /> Scroll to discover</div>
      </section>}

      <PartnerLogos items={content["Partners & clients"] ?? []} />

      {about && <section className="about section" id="about">
        <div className="section-number">01 / WHO WE ARE</div>
        <div className="about-heading">
          <h2>{about.title.includes(". ") ? <>{about.title.slice(0, about.title.indexOf(". ") + 1)}<br /><span>{about.title.slice(about.title.indexOf(". ") + 2)}</span></> : about.title}</h2>
          <div><p>{about.detail}</p><a href="#contact" className="text-link">Discover the GUBA difference <span>→</span></a></div>
        </div>
        <div className="capability-map">
          <div className="map-copy">
            <span className="map-label">THE GUBA ADVANTAGE</span>
            <h3>Integrated by design.</h3>
            <p>Complex transformation fails at the seams. Our multidisciplinary teams design the whole system—so technology, infrastructure, people, and performance work as one.</p>
            <ul><li><b>01</b> One vision from strategy to operations</li><li><b>02</b> Certified expertise across the technology stack</li><li><b>03</b> Local context with global delivery standards</li></ul>
          </div>
          <div className="map-visual" aria-label="Integrated capability model">
            <div className="map-circle mc-one"><span>STRATEGY</span></div>
            <div className="map-circle mc-two"><span>ENGINEERING</span></div>
            <div className="map-circle mc-three"><span>TECHNOLOGY</span></div>
            <div className="map-center"><b>G</b><small>ONE<br />SYSTEM</small></div>
          </div>
        </div>
      </section>}

      <PublicCollection section="Homepage" items={(content.Homepage ?? []).filter(item => !["hero", "about", "academy"].includes(item.fields?.placement ?? "section"))} title="From GUBA" />

      {selectedService && <section className="services section" id="services">
        <div className="section-kicker"><span>02 / CAPABILITIES</span><p>Built around outcomes, not products.</p></div>
        <div className="services-intro"><h2>Expertise for every<br /><em>inflection point.</em></h2><p>Whether you’re modernizing core infrastructure or building a new digital service, our teams bring the clarity and capability to make it real.</p></div>
        <div className="service-layout">
          <div className="service-tabs" role="tablist" aria-label="GUBA services">
            {services.map((service, index) => (
              <button key={service.title} className={index === activeService ? "active" : ""} onClick={() => setActiveService(index)} role="tab" aria-selected={index === activeService}>
                <span>{service.code}</span><strong>{service.title}</strong><i>→</i>
              </button>
            ))}
          </div>
          <div className="service-panel" role="tabpanel">
            <div className="service-geometry">{imageUrl(selectedService) && <Image unoptimized className="cms-service-image" src={imageUrl(selectedService)!} alt={selectedService.title} width={600} height={600} />}<span>{selectedService.code}</span><i /><i /><i /></div>
            <div className="service-detail">
              <span className="panel-label">{selectedService.accent}</span>
              <strong className="panel-metric">{selectedService.metric}</strong>
              <h3>{selectedService.title}</h3>
              <p>{selectedService.copy}</p>
              <div className="tag-row">{selectedService.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <a href={recordPath("Services", selectedService)}>Explore this capability <span>↗</span></a>
            </div>
          </div>
        </div>
      </section>}

      <section className="projects section" id="projects">
        <div className="section-kicker light"><span>03 / SELECTED WORK</span><a href="#contact">View all case studies <b>→</b></a></div>
        <div className="projects-head"><h2>Proof in the<br /><em>performance.</em></h2><p>Real-world engineering. Measurable transformation.</p></div>
        <div className="project-grid">
          {projects.map((project, index) => (
            <article className={`project-card ${project.className}`} key={project.id}>
              <div className="project-art" aria-hidden="true">{imageUrl(project) ? <Image unoptimized src={imageUrl(project)!} alt="" width={640} height={400} loading="lazy" /> : <><span className="project-lines" /><b>0{index + 1}</b></>}</div>
              <div className="project-copy"><span>{project.sector}</span><h3>{project.title}</h3><p>{project.result}</p>{project.detail !== project.result && <p className="project-description">{project.detail.slice(0, 180)}</p>}<a href={recordPath("Projects", project)} aria-label={`Read case study: ${project.title}`}>↗</a></div>
            </article>
          ))}
        </div>
      </section>

      {trainingVisible && <section className="training section" id="training">
        <div className="training-visual"><div className="academy-orb"><span>G</span></div><div className="academy-chip chip-a">NETWORK ENGINEERING</div><div className="academy-chip chip-b">CYBER SECURITY</div><div className="academy-chip chip-c">CLOUD & DATA</div></div>
        <div className="training-copy"><span>GUBA ACADEMY</span><h2>Capability that<br /><em>stays with you.</em></h2><p>Build the people behind the systems. Our instructor-led programs combine global certifications with practical, locally relevant experience.</p><div className="training-points"><div><b>{academy?.fields?.courses || "40+"}</b><span>Professional<br />courses</span></div><div><b>{academy?.fields?.trained || "2,500+"}</b><span>Professionals<br />trained</span></div></div><a href={content.Training?.length ? "#training-programs" : "#contact"} className="button button-gold">Explore training programs <span>↗</span></a></div>
      </section>}

      {trainingVisible && <><div id="training-programs" /><PublicCollection section="Training" items={content.Training ?? []} title="Training programs" /></>}
      <PublicCollection section="Insights" items={content.Insights ?? []} title="Insights & news" />
      <PublicCollection section="Events" items={content.Events ?? []} title="Upcoming events" />
      <PublicCollection section="Jobs" items={content.Jobs ?? []} title="Build your career with GUBA" />
      <PublicCollection section="Products" items={content.Products ?? []} title="Products & solutions" />
      {!!content.Clients?.length && <section className="trusted-strip" id="clients" aria-label="Our clients"><p>Our clients</p><div>{content.Clients.map(item => <span key={item.id}><a href={recordPath("Clients", item)}>{item.title}</a></span>)}</div></section>}
      <PublicCollection section="Testimonials" items={content.Testimonials ?? []} title="What our clients say" />
      <PublicCollection section="Media library" items={content["Media library"] ?? []} title="Resources & media" />
      <PublicCollection section="Newsletter" items={content.Newsletter ?? []} title="GUBA updates" />

      <section className="cta" id="contact">
        <div className="cta-grid" aria-hidden="true" />
        <span>LET’S BUILD WHAT’S NEXT</span>
        <h2>Your ambition.<br /><em>Engineered.</em></h2>
        <p>Bring us the challenge. We’ll bring the right team, the right technology, and a clear path forward.</p>
        <div><a href="/contact" className="button button-gold">Start a conversation <span>↗</span></a><a href="#contact" onClick={event => { event.preventDefault(); setContactForm("rfq"); }} className="button button-outline">Request a quotation</a></div>
      </section>

      <footer>
        <div className="footer-main">
          <div className="footer-brand"><a className="brand" href="#top"><span className="brand-mark">G</span><span className="brand-copy"><strong>GUBA</strong><small>{site.settings.siteName.replace(/^GUBAs*/i, "")}</small></span></a><p>Engineering progress.<br />Empowering growth.</p><div className="socials"><a href="#" aria-label="LinkedIn">in</a><a href="#" aria-label="X">𝕏</a><a href="#" aria-label="YouTube">▶</a></div></div>
          <div className="footer-links"><div><b>Company</b><a href="#about">About us</a><a href="#projects">Projects</a><a href="#partners">Partners</a></div><div><b>Expertise</b><a href="#services">Infrastructure</a><a href="#services">Software</a><a href="#services">Cyber security</a>{trainingVisible && <a href="#training">Training</a>}</div><div><b>Connect</b><a href="/contact">Contact</a><a href="#contact" onClick={event => {event.preventDefault();setContactForm("contact");}}>Support center</a></div></div>
        </div>
        <div className="footer-bottom"><span>© 2026 {site.settings.siteName}. All rights reserved.</span><span className="footer-credit"><DeveloperCredit /></span><a href="#top">Back to top ↑</a></div>
      </footer>

      <ContactDialog kind={contactForm} onClose={() => setContactForm(null)} />
      <button className={`chat-launcher ${chatOpen ? "open" : ""}`} onClick={() => setChatOpen(!chatOpen)} aria-label="Open GUBA assistant"><span>{chatOpen ? "×" : "G"}</span><i /></button>
      {chatOpen && (
        <aside className="chat-panel" aria-label="GUBA company assistant">
          <div className="chat-head"><div><span>G</span><p><strong>GUBA Assistant</strong><small><i /> Online · EN / አማ</small></p></div><button onClick={() => setChatOpen(false)} aria-label="Close assistant">×</button></div>
          <div className="chat-body">
            {messages.map((message, index) => <div key={index} className={`message ${message.from}`}>{message.text}</div>)}
            {messages.length === 1 && <div className="suggestions"><button onClick={() => ask("What services do you offer?")}>Explore GUBA services</button><button onClick={() => ask("I need a quote")}>Help me request a quote</button>{trainingVisible && <button onClick={() => ask("Tell me about training")}>Find a training program</button>}</div>}
          </div>
          <form className="chat-form" onSubmit={submitChat}><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask GUBA anything…" aria-label="Message GUBA assistant" /><button aria-label="Send message">↑</button></form>
          <small className="chat-note">AI assistant · Answers based on GUBA information</small>
        </aside>
      )}
    </main>
  );
}
