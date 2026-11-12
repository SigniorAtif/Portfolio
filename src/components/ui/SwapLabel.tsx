/**
 * The site's hover language for links: the label is stacked twice in a
 * one-line window and slides up to its copy when the surrounding link or
 * button is hovered or focused. Styles are `.swap` in globals.css.
 */
export function SwapLabel({ children, className }: { children: string; className?: string }) {
  return (
    <span className={`swap ${className ?? ""}`}>
      <span className="swap-in">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </span>
    </span>
  );
}
