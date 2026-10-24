import { AppDestinationLink } from "@/site-context";
import {
  ArrowUpRight,
  AudioLines,
  Compass,
  Layers3,
  Search,
  SlidersHorizontal,
  Bookmark,
  Mic2,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from "lucide-react";

function ToolPreview() {
  return (
    <div className="ws-preview ws-preview-tools" aria-hidden="true">
      <div className="ws-mini-window">
        <div className="ws-mini-top">
          <span className="ws-window-dots">
            <i />
            <i />
            <i />
          </span>
          <span>Find your next favorite tool</span>
          <SlidersHorizontal size={13} />
        </div>
        <div className="ws-mini-search">
          <Search size={15} />
          <span>Something for your next big idea…</span>
          <kbd>⌘ K</kbd>
        </div>
        <div className="ws-mini-apps">
          <div>
            <span className="ws-tool-icon ws-icon-purple">N</span>
            <span>
              Make space
              <br />
              <b>for ideas</b>
            </span>
          </div>
          <div>
            <span className="ws-tool-icon ws-icon-blue">
              <Layers3 size={23} />
            </span>
            <span>
              Build
              <br />
              <b>something great</b>
            </span>
          </div>
          <div>
            <span className="ws-tool-icon ws-icon-orange">
              <Sparkles size={23} />
            </span>
            <span>
              Find your
              <br />
              <b>creative flow</b>
            </span>
          </div>
        </div>
        <div className="ws-mini-bottom">
          <span>
            <i />
            159 tools to discover
          </span>
          <Bookmark size={14} />
        </div>
      </div>
      <span className="ws-preview-sticker">
        <Compass size={15} /> A little curiosity goes a long way.
      </span>
    </div>
  );
}
function VoicePreview() {
  const heights = [
    13, 22, 36, 24, 48, 70, 45, 28, 60, 86, 52, 34, 64, 92, 70, 40, 56, 77, 46,
    26, 42, 62, 36, 20, 31, 18, 10,
  ];
  return (
    <div className="ws-preview ws-preview-voice" aria-hidden="true">
      <div className="ws-voice-orbit ws-orbit-one" />
      <div className="ws-voice-orbit ws-orbit-two" />
      <div className="ws-voice-caption">
        <span>
          <Mic2 size={13} /> YOUR VOICE. YOUR PACE.
        </span>
        <span className="ws-live-dot" />
      </div>
      <div className="ws-waveform">
        {heights.map((height, i) => (
          <i
            key={i}
            style={{ height: `${height}%`, animationDelay: `${i * 45}ms` }}
          />
        ))}
      </div>
      <div className="ws-voice-bottom">
        <span className="ws-play-mark">♪</span>
        <div>
          A little practice.
          <br />
          <strong>A little more you.</strong>
        </div>
        <AudioLines size={25} />
      </div>
    </div>
  );
}
export default function Home() {
  return (
    <main className="ws-home">
      <header className="ws-hero">
        <div className="ws-hero-copy">
          <span className="ws-kicker">
            <span /> A LITTLE SPACE FOR YOUR NEXT CHAPTER
          </span>
          <h1>
            Good tools.
            <br />
            More <em>possibility.</em>
          </h1>
          <p>
            A place to find what works for you.
            <br className="ws-desktop-break" /> Discover your next tool, or find
            your voice.
          </p>
        </div>
        <div className="ws-hero-note">
          <span className="ws-note-symbol">✳</span>
          <p>
            Follow your curiosity.
            <br />
            Make something yours.
          </p>
          <span className="ws-note-line" />
        </div>
      </header>
      <section aria-labelledby="ws-apps-heading" className="ws-app-section">
        <div className="ws-section-heading">
          <h2 id="ws-apps-heading">Your workspace</h2>
          <span>Your apps. One account. Room to grow.</span>
        </div>
        <div className="ws-cards">
          <AppDestinationLink
            app="toolnest"
            className="ws-app-card ws-toolnest-card"
            aria-label="Open Toolnest"
          >
            <ToolPreview />
            <div className="ws-card-content">
              <div className="ws-card-label">
                <span>
                  <Compass size={14} /> DISCOVER & COMPARE
                </span>
                <span className="ws-card-index">01</span>
              </div>
              <div className="ws-card-title">
                <h2>Toolnest</h2>
                <span className="ws-round-arrow">
                  <ArrowUpRight size={24} />
                </span>
              </div>
              <p>
                Less searching. Better finding. Explore software, compare
                alternatives, and build your own shortlist.
              </p>
              <div className="ws-card-footer">
                <span>159 apps to explore</span>
                <strong>
                  Open Toolnest <ArrowRight size={15} />
                </strong>
              </div>
            </div>
          </AppDestinationLink>
          <AppDestinationLink
            app="musecoach"
            className="ws-app-card ws-musecoach-card"
            aria-label="Open MuseCoach"
          >
            <VoicePreview />
            <div className="ws-card-content">
              <div className="ws-card-label">
                <span>
                  <AudioLines size={14} /> SING & GROW
                </span>
                <span className="ws-card-index">02</span>
              </div>
              <div className="ws-card-title">
                <h2>MuseCoach</h2>
                <span className="ws-round-arrow">
                  <ArrowUpRight size={24} />
                </span>
              </div>
              <p>
                Find confidence in your own sound. Warm up, record a take, and
                turn small moments into progress.
              </p>
              <div className="ws-card-footer">
                <span>100 ways to practice</span>
                <strong>
                  Open MuseCoach <ArrowRight size={15} />
                </strong>
              </div>
            </div>
          </AppDestinationLink>
        </div>
      </section>
      <aside className="ws-benefits">
        <div>
          <ShieldCheck size={21} />
          <p>
            <strong>Your space, your say</strong>
            <span>Choose what stays on your device.</span>
          </p>
        </div>
        <div>
          <RefreshCw size={21} />
          <p>
            <strong>Pick up where you left off</strong>
            <span>Optional sync when you sign in.</span>
          </p>
        </div>
        <a href="/settings">
          Make yourself at home <ArrowUpRight size={17} />
        </a>
      </aside>
      <footer className="ws-footer">
        <span>
          Workspace <span className="ws-footer-dot">•</span> Built for a curious
          mind.
        </span>
        <div>
          <a href="/privacy">Privacy & data</a>
          <a href="/device-export">Previous device data</a>
          <a href="/settings">
            Account & settings <ArrowUpRight size={13} />
          </a>
        </div>
      </footer>
    </main>
  );
}
