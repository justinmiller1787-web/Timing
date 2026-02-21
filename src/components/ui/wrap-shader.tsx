"use client";

import { Warp } from "@paper-design/shaders-react";

export default function WarpBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Warp
        style={{ height: "100%", width: "100%" }}
        proportion={0.6}
        softness={1}
        distortion={0.35}
        swirl={1}
        swirlIterations={12}
        shape="checks"
        shapeScale={0.15}
        scale={1.2}
        rotation={0}
        speed={0.6}
        colors={[
          "hsl(215, 100%, 12%)",
          "hsl(210, 90%, 18%)",
          "hsl(205, 80%, 22%)",
          "hsl(200, 70%, 28%)"
        ]}
      />
    </div>
  );
}
