"use client";
import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface ChartPoint {
  time: string;
  price: number;
}

interface TokenPriceChartProps {
  tokenAddress: string;
}

const TokenPriceChart: React.FC<TokenPriceChartProps> = ({ tokenAddress }) => {
  const [data, setData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 86400;

      /*
      const res = await fetch(`https://public-api.birdeye.so/defi/history_price?address=${tokenAddress}&address_type=token&type=15m&time_from=${oneDayAgo}&time_to=${now}`,
        {
          headers: {
            "X-API-KEY": "xxxxxx",
            "x-chain": "solana"
          },
        }
      );
      */

      //TODO: Replace API-END-POINT-HERE
      const res = await fetch(`API-END-POINT-HERE?address=${tokenAddress}&address_type=token&type=15m&time_from=${oneDayAgo}&time_to=${now}`,
        {
          headers: {
            "x-chain": "solana"
          },
        }
      );
      
      const json = await res.json();

      if (json.data?.items) {
        const formatted = json.data.items.map((item: { unixTime: number; value: number }) => ({
          time: new Date(item.unixTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          price: item.value,
        }));
        setData(formatted);
      }
    };

    fetchData();
  }, [tokenAddress]);

  return (
    <div className="w-full max-h-[120px] p-4 bg-zinc-900 rounded-xl shadow">
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data}>
          <Tooltip
            contentStyle={{
              backgroundColor: "#334155",
              border: "none",
              color: "white",
              fontSize: "0.75rem",
            }}
            labelStyle={{ display: "none" }}
            cursor={{ stroke: "#64748b", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TokenPriceChart;

