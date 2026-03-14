import { SwaipLogo } from "./Navbar";
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t py-6 px-4" style={{ borderColor: "oklch(0.14 0.04 270)", background: "oklch(0.07 0.02 270)" }}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SwaipLogo className="text-sm" />
          <span className="text-gray-700 text-xs font-rajdhani">© 2026 SWAIP. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-5 flex-wrap justify-center">
          <Link href="/support">
            <span className="text-gray-600 hover:text-[#ff2d78] transition-colors font-rajdhani text-sm cursor-pointer">Support</span>
          </Link>
          <a
            href="https://twitter.com/xxvelonxx"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-orbitron text-sm font-bold transition-all hover:opacity-80"
            style={{ color: "#ff2d78", textShadow: "0 0 10px rgba(255,45,120,0.4)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            @xxvelonxx
          </a>
        </div>
      </div>
    </footer>
  );
}
