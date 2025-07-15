import { Tag } from "lucide-react";

interface CycleTagProp {
  ifTested: boolean;
}

function CycleTag({ ifTested }: CycleTagProp) {
  const textColor = ifTested ? "#4ade72" : "#fb8222";
  const bgColor = ifTested ? "#0d2015" : "#2c150c";
  const sizeScale = 0.9;
  return (
    <div
      style={{
        backgroundColor: bgColor,
      }}
      className=" flex flex-row items-center gap-1 p-1 px-3  rounded-full"
    >
      <Tag color={textColor} size={16 * sizeScale} />
      <span
        style={{
          fontSize: 14 * sizeScale,
          color: textColor,
        }}
        className=" text-red-50 "
      >
        {ifTested ? "Tested" : "Draft"}
      </span>
    </div>
  );
}

export default CycleTag;
