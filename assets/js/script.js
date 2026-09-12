document.documentElement.classList.add('js');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('.site-header');
const brand = document.querySelector('.brand');
const glow = document.querySelector('.cursor-glow');
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
document.querySelectorAll('.current-year').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

function setMenu(open) {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  mobileMenu.setAttribute('aria-hidden', String(!open));
  mobileMenu.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
}

menuToggle?.addEventListener('click', () => {
  setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
});

document.querySelectorAll('.mobile-menu a').forEach((link) => {
  link.addEventListener('click', () => setMenu(false));
});

brand?.addEventListener('click', () => {
  setMenu(false);
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuToggle.focus();
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 920) setMenu(false);
}, { passive: true });

if (!prefersReducedMotion) {
  let lastScroll = window.scrollY;
  let scrollTicking = false;

  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(() => {
      const currentScroll = window.scrollY;
      const movingDown = currentScroll > lastScroll;
      if (header) {
        header.style.transform = currentScroll > 180 && movingDown
          ? 'translate(-50%, -105px)'
          : 'translate(-50%, 0)';
      }
      lastScroll = currentScroll;
      scrollTicking = false;
    });
  }, { passive: true });

  if (glow && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const interactiveSelector = 'a, button, input, textarea, select, [role="button"]';
    const moveX = window.gsap?.quickTo(glow, 'x', { duration: .28, ease: 'power3.out' });
    const moveY = window.gsap?.quickTo(glow, 'y', { duration: .28, ease: 'power3.out' });

    if (window.gsap) window.gsap.set(glow, { xPercent: -50, yPercent: -50 });

    window.addEventListener('pointermove', (event) => {
      glow.style.opacity = '1';
      if (moveX && moveY) {
        moveX(event.clientX);
        moveY(event.clientY);
      } else {
        glow.style.left = `${event.clientX}px`;
        glow.style.top = `${event.clientY}px`;
      }
    }, { passive: true });

    document.addEventListener('pointerover', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      glow.classList.toggle('is-interactive', Boolean(target?.closest(interactiveSelector)));
    }, { passive: true });

    window.addEventListener('pointerout', (event) => {
      if (!event.relatedTarget) glow.style.opacity = '0';
    }, { passive: true });

    window.addEventListener('pointerdown', () => glow.classList.add('is-pressed'), { passive: true });
    window.addEventListener('pointerup', () => glow.classList.remove('is-pressed'), { passive: true });
  }
}

function initMotion() {
  if (prefersReducedMotion || !window.gsap || !window.ScrollTrigger) {
    document.querySelectorAll('.process-step').forEach((step) => step.classList.add('is-active'));
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro
    .from('.site-header', { opacity: 0, duration: .65 })
    .from('.eyebrow', { y: 16, opacity: 0, duration: .5 }, '-=.2')
    .from('.title-line > span', { yPercent: 110, duration: .9, stagger: .1 }, '-=.15')
    .from('.hero-lead', { y: 22, opacity: 0, duration: .65 }, '-=.5')
    .from('.hero-actions', { y: 18, opacity: 0, duration: .55 }, '-=.38')
    .from('.hero-credibility', { y: 18, opacity: 0, duration: .6 }, '-=.38')
    .from('.hero-links', { y: 12, opacity: 0, duration: .45 }, '-=.3')
    .from('.portrait-frame', { clipPath: 'inset(18% 16% 18% 16% round 110px 20px)', scale: .94, opacity: 0, duration: 1.05 }, '-=1')
    .from('.portrait-frame img', { scale: 1.1, duration: 1.2 }, '-=1.05')
    .from('.portrait-card', { y: 25, opacity: 0, stagger: .12, duration: .45 }, '-=.5');

  gsap.to('.portrait-frame', {
    y: -54,
    rotate: -3.25,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.1 }
  });
  gsap.to('.portrait-orbit', {
    rotate: 22,
    scale: 1.04,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.1 }
  });
  gsap.to('.orbit-a', {
    rotate: 55,
    scale: 1.16,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('.orbit-b', {
    rotate: -70,
    scale: .86,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  gsap.from('.problems-intro', {
    y: 55,
    opacity: 0,
    duration: .9,
    scrollTrigger: { trigger: '.problems', start: 'top 72%' }
  });
  document.querySelectorAll('.problem-line').forEach((line) => {
    gsap.from(line, {
      x: 38,
      opacity: .18,
      scrollTrigger: { trigger: line, start: 'top 82%', end: 'top 52%', scrub: .8 }
    });
  });

  gsap.from('.services-heading > *', {
    y: 55,
    opacity: 0,
    stagger: .12,
    duration: .8,
    scrollTrigger: { trigger: '.services-heading', start: 'top 78%' }
  });
  document.querySelectorAll('.service-row').forEach((row) => {
    gsap.from(row, {
      y: 34,
      opacity: 0,
      duration: .6,
      scrollTrigger: { trigger: row, start: 'top 88%' }
    });
  });

  gsap.from('.work-intro-grid > *', {
    y: 55,
    opacity: 0,
    stagger: .15,
    duration: .85,
    scrollTrigger: { trigger: '.work-intro', start: 'top 72%' }
  });

  gsap.from('.flagship-copy', {
    y: 65,
    opacity: 0,
    scrollTrigger: { trigger: '.flagship-grid', start: 'top 78%', end: 'top 38%', scrub: 1 }
  });
  gsap.from('.system-core', {
    scale: .72,
    opacity: 0,
    duration: .9,
    scrollTrigger: { trigger: '.system-visual', start: 'top 72%' }
  });
  gsap.from('.system-node', {
    scale: .86,
    y: 25,
    opacity: 0,
    stagger: .12,
    duration: .65,
    scrollTrigger: { trigger: '.system-visual', start: 'top 67%' }
  });
  gsap.from('.system-paths path', {
    strokeDashoffset: 90,
    opacity: 0,
    stagger: .12,
    duration: 1.1,
    scrollTrigger: { trigger: '.system-visual', start: 'top 63%' }
  });
  gsap.to('.orbit-one', {
    rotate: 48,
    scrollTrigger: { trigger: '.system-visual', start: 'top bottom', end: 'bottom top', scrub: 1.2 }
  });
  gsap.to('.orbit-two', {
    rotate: -35,
    scrollTrigger: { trigger: '.system-visual', start: 'top bottom', end: 'bottom top', scrub: 1.2 }
  });
  gsap.from('.production-story > *', {
    y: 38,
    opacity: 0,
    stagger: .12,
    duration: .75,
    scrollTrigger: { trigger: '.production-story', start: 'top 78%' }
  });

  const processSteps = gsap.utils.toArray('.process-step');
  processSteps.forEach((step) => {
    ScrollTrigger.create({
      trigger: step,
      start: 'top 66%',
      end: 'bottom 42%',
      toggleClass: { targets: step, className: 'is-active' }
    });
  });
  gsap.to('.process-progress i', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.process-steps', start: 'top 58%', end: 'bottom 58%', scrub: true }
  });

  gsap.from('.automation-copy > *', {
    y: 42,
    opacity: 0,
    stagger: .1,
    duration: .7,
    scrollTrigger: { trigger: '.automation', start: 'top 72%' }
  });
  gsap.from('.flow-stage', {
    y: 55,
    scale: .94,
    opacity: 0,
    stagger: .16,
    duration: .75,
    scrollTrigger: { trigger: '.automation-visual', start: 'top 75%' }
  });
  gsap.to('.flow-arrow i', {
    xPercent: 230,
    duration: .9,
    stagger: .2,
    repeat: -1,
    repeatDelay: .8,
    ease: 'power2.inOut'
  });

  gsap.from('.invoice-visual', {
    y: 70,
    rotate: -5,
    opacity: 0,
    scrollTrigger: { trigger: '.invoice', start: 'top 78%', end: 'top 45%', scrub: .9 }
  });
  gsap.from('.pipeline div', {
    y: 22,
    opacity: 0,
    stagger: .12,
    duration: .55,
    scrollTrigger: { trigger: '.invoice-visual', start: 'top 64%' }
  });
  gsap.from('.invoice-copy > *', {
    y: 35,
    opacity: 0,
    stagger: .09,
    duration: .65,
    scrollTrigger: { trigger: '.invoice-copy', start: 'top 76%' }
  });

  gsap.from('.about-grid > *', {
    y: 55,
    opacity: 0,
    stagger: .15,
    duration: .8,
    scrollTrigger: { trigger: '.about', start: 'top 72%' }
  });
  gsap.from('.contact h2', {
    scale: .78,
    opacity: 0,
    duration: 1,
    scrollTrigger: { trigger: '.contact', start: 'top 64%' }
  });
  gsap.to('.contact-glow', {
    scale: 1.35,
    scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom bottom', scrub: true }
  });
}

initMotion();
