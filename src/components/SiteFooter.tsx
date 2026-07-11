export default function SiteFooter() {
  return (
    <footer className="px-5 py-6 text-center">
      <p className="mx-auto max-w-xl text-xs leading-relaxed text-muted">
        Made by Pablo Sánchez for Photoroom&apos;s public growth challenge. Not
        affiliated with Photoroom; I&apos;m part of the{" "}
        <a
          href="https://www.photoroom.com/campaign/photoroom-with-friends"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          Photoroom with Friends
        </a>{" "}
        referral program.{" "}
        <a
          href="https://github.com/psanchezmolina/photoscore"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          Source on GitHub
        </a>
        .
      </p>
    </footer>
  );
}
