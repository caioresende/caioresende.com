import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis();

lenis.on("scroll", ScrollTrigger.update);

function update(time) {
  lenis.raf(time * 1000);
}

gsap.ticker.add(update);
gsap.ticker.lagSmoothing(0);
