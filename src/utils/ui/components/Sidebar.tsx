import type { ReactNode } from "react";
import type { SignerState } from "@polkadot-apps/signer";
import { truncateAddress } from "@polkadot-apps/address";
import type { Tab, View } from "../../types";
import { Avatar } from "./Avatar";
import { HomeIcon, LogoIcon, MoreIcon, UserIcon } from "./Icons";

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
  account?: SignerState["selectedAccount"];
  onComposeClick: () => void;
}

export function Sidebar({ view, onNavigate, account, onComposeClick }: SidebarProps) {
  const active: Tab = view.kind;

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-logo" aria-label="tw33d3r">
          <LogoIcon />
        </div>

        <nav className="sidebar-nav">
          <NavItem
            icon={<HomeIcon filled={active === "feed"} />}
            label="Home"
            active={active === "feed"}
            onClick={() => onNavigate({ kind: "feed" })}
          />
          <NavItem
            icon={<UserIcon filled={active === "mine" || active === "profile"} />}
            label="Profile"
            active={active === "mine"}
            onClick={() => onNavigate({ kind: "mine" })}
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

        {account && (
          <AccountPill
            account={account}
            onClick={() => onNavigate({ kind: "mine" })}
          />
        )}
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

function AccountPill({
  account,
  onClick,
}: {
  account: NonNullable<SignerState["selectedAccount"]>;
  onClick?: () => void;
}) {
  const name = account.name ?? "Anonymous";
  const handle = account.address
    ? truncateAddress(account.address)
    : truncateAddress(account.h160Address);

  return (
    <button
      className="account-pill"
      title={account.address}
      onClick={onClick}
      type="button"
    >
      <Avatar seed={account.h160Address} size={40} />
      <div className="account-pill-text">
        <span className="account-pill-name">{name}</span>
        <span className="account-pill-handle">{handle}</span>
      </div>
      <span className="account-pill-more" aria-hidden="true">
        <MoreIcon />
      </span>
    </button>
  );
}
