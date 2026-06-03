"use client";

import { SearchDoc } from "@/lib/api";

// 從 document 取出 location.coordinates,GeoJSON 格式為 [經度 lng, 緯度 lat]
function extractLatLng(
  doc: SearchDoc
): { lat: number; lng: number } | null {
  const loc = doc["location"] as
    | { coordinates?: unknown }
    | undefined
    | null;
  const coords = loc?.coordinates;
  if (
    Array.isArray(coords) &&
    coords.length >= 2 &&
    typeof coords[0] === "number" &&
    typeof coords[1] === "number"
  ) {
    return { lng: coords[0] as number, lat: coords[1] as number };
  }
  return null;
}

export default function SearchResultCard({
  doc,
  rank,
  isHybrid = false,
}: {
  doc: SearchDoc;
  rank: number;
  isHybrid?: boolean;
}) {
  const latlng = extractLatLng(doc);
  const name = (doc["name"] as string) || "(無名稱)";
  const description = (doc["description"] as string) || "";
  const add = (doc["add"] as string) || "";

  const score = doc._score;
  const rerankScore = doc._rerank_score;
  const textScore = doc._text_score;
  const vectorScore = doc._vector_score;
  const textRank = doc._text_rank;
  const vectorRank = doc._vector_rank;

  const mapSrc = latlng
    ? `https://maps.google.com/maps?q=${latlng.lat},${latlng.lng}&z=15&output=embed`
    : null;

  return (
    <div className="result-card">
      <div className="result-header">
        <span className="result-rank">#{rank}</span>
        <span className="result-name">{name}</span>
        <span className="result-scores">
          {isHybrid ? (
            <>
              {typeof textScore === "number" ? (
                <span className="score-badge text">
                  Text: {textScore.toFixed(4)}
                </span>
              ) : typeof textRank === "number" ? (
                <span className="score-badge text">Text rank: {textRank}</span>
              ) : (
                <span className="score-badge muted-badge">Text: —</span>
              )}
              {typeof vectorScore === "number" ? (
                <span className="score-badge vector">
                  Vector: {vectorScore.toFixed(4)}
                </span>
              ) : typeof vectorRank === "number" ? (
                <span className="score-badge vector">
                  Vector rank: {vectorRank}
                </span>
              ) : (
                <span className="score-badge muted-badge">Vector: —</span>
              )}
              {typeof score === "number" && (
                <span className="score-badge">RRF: {score.toFixed(4)}</span>
              )}
            </>
          ) : (
            typeof score === "number" && (
              <span className="score-badge">score: {score.toFixed(4)}</span>
            )
          )}
          {typeof rerankScore === "number" && (
            <span className="score-badge rerank">
              rerank: {rerankScore.toFixed(4)}
            </span>
          )}
        </span>
      </div>

      <div className="result-body">
        <div className="result-fields">
          <div className="result-field">
            <span className="field-label">店家名稱</span>
            <span className="field-value">{name}</span>
          </div>
          <div className="result-field">
            <span className="field-label">店家描述</span>
            <span className="field-value">{description || "—"}</span>
          </div>
          <div className="result-field">
            <span className="field-label">地址</span>
            <span className="field-value">{add || "—"}</span>
          </div>
        </div>

        <div className="result-map">
          {mapSrc ? (
            <iframe
              title={`map-${rank}`}
              src={mapSrc}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="map-missing">此筆無 location.coordinates</div>
          )}
        </div>
      </div>
    </div>
  );
}
