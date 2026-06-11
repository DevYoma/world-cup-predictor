import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="w-full max-w-md p-4">
        <SignUp appearance={{
          variables: {
            colorPrimary: "#D4AF37", // Gold brand color
          }
        }} />
      </div>
    </div>
  );
}
