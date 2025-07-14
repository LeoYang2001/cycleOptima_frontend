import React from "react";
import type { NavigationCardType } from "../../types/home/type";
import { PinContainer } from "../ui/3d-pin";
import { Color } from "../../constants";

interface NavigationCardProp {
  navCard: NavigationCardType;
}

function NavigationCard({ navCard }: NavigationCardProp) {
  const scaleVal = 1.15;
  return (
    <PinContainer href={navCard.url} title={navCard.title}>
      <div
        style={{
          width: 230 * scaleVal,
          height: 270 * scaleVal,
        }}
        className=" rounded-lg p-2 flex  flex-col dark:text-white text-gray-400  "
      >
        <span className=" flex-1">{navCard.des}</span>
        <div
          className="  rounded-lg flex justify-center items-center"
          style={{
            height: "60%",
            backgroundColor: Color.lighterDark,
          }}
        >
          <navCard.Icon size={38} />
        </div>
      </div>
    </PinContainer>
  );
}

export default NavigationCard;
