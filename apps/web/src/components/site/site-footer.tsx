import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="wrap">
        <span>
          <b
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "1.3rem",
              color: "var(--on-dark)",
            }}
          >
            Àríyá
          </b>{" "}
          by OwambePlan
        </span>
        <span>Àríyá (ah-ree-YAH) is Yoruba for merriment.</span>
        <span>
          <Link href="/">The film</Link> · <Link href="/about">About</Link> ·{" "}
          <Link href="/product">What we do</Link> ·{" "}
          <Link href="/pricing">Pricing</Link> · <Link href="/docs">Docs</Link>{" "}
          · <Link href="/documentation">Manual</Link> ·{" "}
          <Link href="/privacy">Privacy</Link> ·{" "}
          <Link href="/terms">Terms</Link>
        </span>
      </div>
    </footer>
  );
}
