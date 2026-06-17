import Image from "next/image";

export default function LoadingSpinner({ fullPage = false }: { fullPage?: boolean }) {
  if (!fullPage) {
    return (
      <div className="w-5 h-5 rounded-full border-2 border-[#009850]/25 border-t-[#009850] animate-spin" />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <Image
        src="/caritas-logo.png"
        alt="Cargando..."
        width={130}
        height={65}
        priority
        className="opacity-90"
      />
      <div className="w-9 h-9 rounded-full border-4 border-[#009850]/20 border-t-[#009850] animate-spin" />
    </div>
  );
}
