import React from "react";

interface TimeTagProps {
  createdAt?: string;
}

function TimeTag({ createdAt = "Unknown Date" }: TimeTagProps) {
  // Format the date string to yyyy/mm/dd hh:mm format
  const formatDate = (dateString: string): string => {
    try {
      // Try to parse as ISO string directly first
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        // If direct parsing failed, try parsing as JSON string
        try {
          const parsedDate = JSON.parse(dateString);
          const date2 = new Date(parsedDate);
          if (isNaN(date2.getTime())) {
            return "Invalid Date";
          }
          return formatDateString(date2);
        } catch {
          return "Invalid Date";
        }
      }

      return formatDateString(date);
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const textColor = "#aaa";
  const bgColor = "transparent";
  const sizeScale = 0.9;
  return (
    <div
      style={{
        backgroundColor: bgColor,
      }}
      className=" flex flex-row items-center gap-1 p-1 px-3  rounded-full"
    >
      <span
        style={{
          fontSize: 14 * sizeScale,
          color: textColor,
        }}
        className=" text-red-50 "
      >
        {formatDate(createdAt)}
      </span>
    </div>
  );
}

export default TimeTag;
