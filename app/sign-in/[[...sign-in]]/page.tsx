import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="w-full max-w-md p-4">
        <SignIn appearance={{
          variables: {
            colorPrimary: "#D4AF37", // Gold brand color
          }
        }} />
      </div>
    </div>
  );
}
