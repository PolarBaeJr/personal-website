import { site } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-width flow">
        <ul className="link-list">
          {site.links.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
        <p>© {site.name}</p>
      </div>
    </footer>
  );
}
