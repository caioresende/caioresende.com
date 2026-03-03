import Lenis from "lenis";
import gsap from "gsap";

const lenis = new Lenis();

function update(time) {
  lenis.raf(time * 1000);
}

gsap.ticker.add(update);
gsap.ticker.lagSmoothing(0);
