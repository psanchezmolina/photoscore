export default function SiteFooter() {
  return (
    <footer className="px-5 py-6 text-center text-xs leading-relaxed text-muted">
      Made by Pablo Sanchez. Not affiliated with Photoroom. I&apos;m part of the
      Photoroom with Friends referral program.
      <br className="hidden sm:block" />{" "}
      <a
        href="https://github.com/psanchezmolina/photoscore"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-ink underline-offset-2 transition-colors hover:text-accent hover:underline"
      >
        GitHub
      </a>
    </footer>
  );
}
