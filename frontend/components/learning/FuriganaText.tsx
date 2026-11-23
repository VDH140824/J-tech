import { Fragment } from "react";
import { parseFurigana } from "../../utils/furigana";

/** Hiển thị chữ có cú pháp {漢字|かんじ}; chỉ hiện cách đọc trên chữ Hán khi showReading bật. */
export function FuriganaText({ text, showReading }: { text: string; showReading: boolean }) {
  return (
    <>
      {parseFurigana(text).map((segment, i) =>
        segment.reading && showReading ? (
          <ruby key={i}>
            {segment.text}
            <rp>(</rp>
            <rt>{segment.reading}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          <Fragment key={i}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}
