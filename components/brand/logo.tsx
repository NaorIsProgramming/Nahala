import Image from "next/image";

export function Logo() {
  return (
    <>
      <Image
        src="/brand/logo-mark.svg"
        alt="סמל נחלה"
        width={120}
        height={120}
        priority
        unoptimized
        className="size-24 dark:hidden"
      />
      <Image
        src="/brand/logo-mark-dark.svg"
        alt="סמל נחלה"
        width={120}
        height={120}
        priority
        unoptimized
        className="hidden size-24 dark:block"
      />
    </>
  );
}
