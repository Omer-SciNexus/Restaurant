import Link from "next/link";
import { Logo } from "../ui/Logo";

const COLUMNS = [
  {
    title: "Eat",
    links: [
      ["/menu", "Menu"],
      ["/build-a-bowl", "Build a bowl"],
      ["/branches", "Branches"],
      ["/book", "Book a table"],
      ["/events", "Events and catering"],
    ],
  },
  {
    title: "Learn",
    links: [
      ["/our-food", "Our food"],
      ["/farms", "Our farms"],
      ["/cook", "Cook at home"],
      ["/sustainability", "Sustainability"],
    ],
  },
  {
    title: "Company",
    links: [
      ["/about", "About"],
      ["/careers", "Careers"],
      ["/contact", "Contact"],
      ["/faq", "FAQ"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["/legal/allergens", "Allergen policy"],
      ["/legal/privacy", "Privacy"],
      ["/legal/terms", "Terms"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-stone">Natural food cooked from whole ingredients, with everything in it shown on the menu.</p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="font-body text-sm font-semibold">{column.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {column.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href!} className="text-stone hover:text-forest hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="border-t border-line px-4 py-4 text-center text-xs text-stone">Our kitchens handle all major allergens. Please tell us about any allergy before you order.</p>
    </footer>
  );
}
