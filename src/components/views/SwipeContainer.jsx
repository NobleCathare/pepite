import React, { useState } from 'react';
import JobCard from '../cards/JobCard';
import { Filter, SlidersHorizontal } from 'lucide-react';

const SwipeContainer = ({ jobs, onAction }) => {
    const [sortBy, setSortBy] = useState('score'); // score, date

    const sortedJobs = [...jobs].sort((a, b) => {
        if (sortBy === 'score') {
            // Primary: Score ATS (High to Low)
            const scoreDiff = b.score_ATS - a.score_ATS;
            if (scoreDiff !== 0) return scoreDiff;
            // Secondary: Score IA (Low to High - "Croissant")
            return (a.score_AI || 0) - (b.score_AI || 0);
        }
        if (sortBy === 'date') return new Date(b.Date_Publication) - new Date(a.Date_Publication);
        return 0;
    });

    return (
        <div className="pb-20 md:pb-0">
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-xl font-bold text-gray-800">
                    Nouvelles Offres <span className="text-gray-400 text-sm font-normal">({jobs.length})</span>
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSortBy('score')}
                        className={`flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold border transition-all shadow-sm
                ${sortBy === 'score' ? 'bg-pepite-gold border-pepite-gold text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-pepite-gold hover:text-pepite-gold'}`}
                    >
                        <SlidersHorizontal size={14} /> Score
                    </button>
                    <button
                        onClick={() => setSortBy('date')}
                        className={`flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold border transition-all shadow-sm
                ${sortBy === 'date' ? 'bg-pepite-gold border-pepite-gold text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-pepite-gold hover:text-pepite-gold'}`}
                    >
                        <Filter size={14} /> Récent
                    </button>
                </div>
            </div>

            <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
                {sortedJobs.map(job => (
                    <JobCard key={job.ID_Annonce} job={job} onAction={onAction} />
                ))}
            </div>

            {jobs.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                    <p className="text-lg">Aucune nouvelle offre à traiter.</p>
                    <p className="text-sm">Revenez plus tard !</p>
                </div>
            )}
        </div>
    );
};

export default SwipeContainer;
