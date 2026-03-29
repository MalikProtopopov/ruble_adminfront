export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="noise-bg flex min-h-screen flex-col items-center justify-center px-4">
      {children}
    </div>
  );
}
