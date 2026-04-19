import { SearchIcon } from "./Icons";

export function TrendsPanel() {
  return (
    <aside className="trends">
      <div className="trends-search">
        <span className="trends-search-icon"><SearchIcon /></span>
        <input
          className="trends-search-input"
          type="search"
          placeholder="Search"
          disabled
        />
      </div>

      <section className="trends-card">
        <h2 className="trends-card-title">Getting started</h2>
        <div className="trends-item">
          <span className="trends-item-label">Welcome to tw33d3r</span>
          <p className="trends-item-body">
            A minimal, on-chain feed on Polkadot. Connect a wallet and post your first tweet.
          </p>
        </div>
      </section>

      <section className="trends-card">
        <h2 className="trends-card-title">What's happening</h2>
        <div className="trends-item">
          <span className="trends-item-meta">On-chain · Paseo</span>
          <span className="trends-item-label">Posts live on Bulletin</span>
          <span className="trends-item-meta">Indexed by contract</span>
        </div>
        <div className="trends-item">
          <span className="trends-item-meta">Coming soon</span>
          <span className="trends-item-label">Likes, replies, follows</span>
        </div>
      </section>

      <footer className="trends-footer">
        <span>tw33d3r · built on Polkadot</span>
      </footer>
    </aside>
  );
}
