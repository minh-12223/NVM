import React, { useState, useEffect } from 'react';
import { Timer, Trophy, RotateCcw, Play } from 'lucide-react';
import { Flashcard } from '../types';

interface MatchGameViewProps {
  cards: Flashcard[];
  bestTimeSec: number;
  onRecordMatchTime: (seconds: number) => void;
}

interface MatchTile {
  tileId: string;
  cardId: string;
  type: 'term' | 'definition';
  text: string;
  matched: boolean;
}

export const MatchGameView: React.FC<MatchGameViewProps> = ({
  cards,
  bestTimeSec,
  onRecordMatchTime,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [selectedTile, setSelectedTile] = useState<MatchTile | null>(null);
  const [wrongPairIds, setWrongPairIds] = useState<string[]>([]);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  const startNewGame = () => {
    const subset = [...cards].sort(() => Math.random() - 0.5).slice(0, 6);
    const generatedTiles: MatchTile[] = [];

    subset.forEach((card) => {
      generatedTiles.push({
        tileId: `term_${card.id}`,
        cardId: card.id,
        type: 'term',
        text: card.term,
        matched: false,
      });
      generatedTiles.push({
        tileId: `def_${card.id}`,
        cardId: card.id,
        type: 'definition',
        text: card.definition,
        matched: false,
      });
    });

    setTiles(generatedTiles.sort(() => Math.random() - 0.5));
    setSelectedTile(null);
    setWrongPairIds([]);
    setElapsedMs(0);
    setIsFinished(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying || isFinished) return;
    const interval = setInterval(() => {
      setElapsedMs((ms) => ms + 100);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, isFinished]);

  const handleTileClick = (tile: MatchTile) => {
    if (tile.matched || wrongPairIds.length > 0) return;

    if (!selectedTile) {
      setSelectedTile(tile);
      return;
    }

    if (selectedTile.tileId === tile.tileId) {
      setSelectedTile(null);
      return;
    }

    // Check match
    if (selectedTile.cardId === tile.cardId && selectedTile.type !== tile.type) {
      const updated = tiles.map((t) =>
        t.cardId === tile.cardId ? { ...t, matched: true } : t
      );
      setTiles(updated);
      setSelectedTile(null);

      if (updated.every((t) => t.matched)) {
        setIsFinished(true);
        setIsPlaying(false);
        const finalSec = Number((elapsedMs / 1000).toFixed(1));
        onRecordMatchTime(finalSec);
      }
    } else {
      // Mismatch penalty (+1 second)
      setElapsedMs((ms) => ms + 1000);
      setWrongPairIds([selectedTile.tileId, tile.tileId]);
      setTimeout(() => {
        setWrongPairIds([]);
        setSelectedTile(null);
      }, 450);
    }
  };

  const formattedSeconds = (elapsedMs / 1000).toFixed(1);

  if (!isPlaying && !isFinished) {
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-3xl p-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-[#2E3856] flex items-center justify-center text-[#4257B2] dark:text-indigo-300 mb-5">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Trò Chơi Ghép Thẻ Tính Giờ (Match)
        </h2>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
          Nối từng cặp Thuật ngữ và Định nghĩa tương ứng nhanh nhất có thể. Mỗi lần ghép sai sẽ bị cộng phạt 1.0 giây!
        </p>

        {bestTimeSec > 0 && (
          <div className="mt-5 text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            Kỷ lục nhanh nhất của bạn: {bestTimeSec.toFixed(1)} giây
          </div>
        )}

        <button
          onClick={startNewGame}
          className="mt-8 inline-flex items-center gap-2.5 px-9 py-4 text-base font-bold text-white bg-[#4257B2] hover:bg-[#344696] rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Bắt đầu chơi</span>
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-3xl p-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Xuất sắc! Bạn đã hoàn thành bàn cờ!
        </h2>
        <div className="mt-5 text-5xl font-extrabold font-mono tabular-nums text-[#4257B2] dark:text-indigo-400">
          {formattedSeconds} giây
        </div>
        {bestTimeSec > 0 && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Kỷ lục tốt nhất: {Math.min(bestTimeSec, Number(formattedSeconds)).toFixed(1)} giây
          </p>
        )}

        <button
          onClick={startNewGame}
          className="mt-8 inline-flex items-center gap-2.5 px-8 py-3.5 text-base font-bold text-white bg-[#4257B2] hover:bg-[#344696] rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Chơi lại để phá kỷ lục</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Live Timer Header */}
      <div className="flex items-center justify-between mb-6 bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-2xl px-6 py-4">
        <div className="flex items-center gap-3">
          <Timer className="w-6 h-6 text-[#4257B2] dark:text-indigo-400" />
          <span className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
            {formattedSeconds}s
          </span>
        </div>

        <div className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
          Còn lại:{' '}
          <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
            {tiles.filter((t) => !t.matched).length / 2} cặp
          </strong>
        </div>

        <button
          onClick={startNewGame}
          className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          Chơi ván mới
        </button>
      </div>

      {/* 12-Tile Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {tiles.map((tile) => {
          if (tile.matched) {
            return (
              <div
                key={tile.tileId}
                className="h-44 rounded-2xl border border-dashed border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 flex items-center justify-center text-sm font-bold text-emerald-600 dark:text-emerald-400 opacity-40"
              >
                Đã ghép đúng
              </div>
            );
          }

          const isSelected = selectedTile?.tileId === tile.tileId;
          const isWrong = wrongPairIds.includes(tile.tileId);

          let cardClasses =
            'bg-white dark:bg-[#1A1D28] border-slate-200 dark:border-[#2E3856] text-slate-800 dark:text-slate-100 hover:border-[#4257B2]';
          if (isSelected) {
            cardClasses =
              'bg-indigo-50 dark:bg-indigo-950/70 border-[#4257B2] dark:border-indigo-400 text-[#4257B2] dark:text-indigo-200 ring-2 ring-[#4257B2]/30';
          }
          if (isWrong) {
            cardClasses =
              'bg-red-50 dark:bg-red-950/70 border-red-500 text-red-700 dark:text-red-200';
          }

          return (
            <button
              key={tile.tileId}
              onClick={() => handleTileClick(tile)}
              className={`h-44 p-5 rounded-2xl border-2 flex flex-col justify-center items-center text-center transition-colors cursor-pointer overflow-hidden ${cardClasses}`}
            >
              <p className="text-sm sm:text-base lg:text-lg font-semibold line-clamp-4 leading-snug">
                {tile.text}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
