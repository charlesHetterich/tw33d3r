import type { ReactNode } from "react";
import type { SignerState } from "@polkadot-apps/signer";
import { truncateAddress } from "@polkadot-apps/address";
import type { Tab } from "../../types";
import { Avatar } from "./Avatar";
import { HomeIcon, UserIcon, LogoIcon, MoreIcon } from "./Icons";

interface SidebarProps {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  account?: SignerState["selectedAccount"];
  onComposeClick: () => void;
}

export function Sidebar({ tab, onTabChange, account, onComposeClick }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-logo" aria-label="tw33d3r">
          <LogoIcon />
        </div>

        <nav className="sidebar-nav">
          <NavItem
            icon={<HomeIcon filled={tab === "feed"} />}
            label="Home"
            active={tab === "feed"}
            onClick={() => onTabChange("feed")}
          />
          <NavItem
            icon={<UserIcon filled={tab === "mine"} />}
            label="My Posts"
            active={tab === "mine"}
            onClick={() => onTabChange("mine")}
          />
        </nav>

        <button
          className="btn btn-primary btn-lg sidebar-post-btn"
          onClick={onComposeClick}
          disabled={!account}
          type="button"
        >
          Post
        </button>

        {account && <AccountPill account={account} />}
      </div>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`sidebar-nav-item${active ? " active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span className="sidebar-nav-icon">{icon}</span>
      <span className="sidebar-nav-label">{label}</span>
    </button>
  );
}

function AccountPill({ account }: { account: NonNullable<SignerState["selectedAccount"]> }) {
  const name = account.name ?? "Anonymous";
  const handle = account.address
    ? truncateAddress(account.address)
    : truncateAddress(account.h160Address);

  return (
    <div className="account-pill" title={account.address}>
      <Avatar address={account.h160Address} size={40} />
      <div className="account-pill-text">
        <span className="account-pill-name">{name}</span>
        <span className="account-pill-handle">{handle}</span>
      </div>
      <span className="account-pill-more" aria-hidden="true">
        <MoreIcon />
      </span>
    </div>
  );
}
