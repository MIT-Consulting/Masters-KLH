const supabaseUrl = 'https://nkedjevewyksuecoarcp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZWRqZXZld3lrc3VlY29hcmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNTE0ODMsImV4cCI6MjA1OTgyNzQ4M30.P7YY4hF5VzNwHGzQzc3c0RRTX5MZv2_Ac8xxynlooxs'
const supabase = supabaseJs.createClient(supabaseUrl, supabaseKey)

document.addEventListener('DOMContentLoaded', async function() {
    const COURSE_PAR = 72;
    const WD_MC_SCORE = 82; // Score assigned for WD/MC unplayed rounds
    
    // Helper function to format scores relative to par
    function formatScoreRelPar(score) {
        if (score === 0) return 'E';
        if (score < 0) return score.toString();
        return `+${score}`;
    }

    // Placeholder function to fetch live scores (simulated data)
    async function fetchLiveMastersScores() {
        const { data, error } = await supabase
            .from('players')
            .select('*')
        
        if (error) throw error
        return data
    }

    // Process player scores with MC/WD rules
    function processPlayerScores(playerData) {
        const rounds_strokes = [];
        const rounds_par = [];
        const cumulative_strokes = [];
        const cumulative_par = [];
        let total_strokes = 0;
        let total_par_numeric = 0;
        
        // Parse rounds if it's a string (from JSONB in Supabase)
        const rounds = typeof playerData.rounds === 'string' 
            ? JSON.parse(playerData.rounds) 
            : playerData.rounds;
        
        // Determine thru status
        let thruStatus = '';
        if (playerData.status === 'F') {
            thruStatus = 'F';
        } else if (playerData.status === 'MC') {
            thruStatus = 'MC';
        } else if (playerData.status === 'WD') {
            thruStatus = 'WD';
        } else {
            // Active player - determine current round
            const lastRoundIndex = rounds.findIndex(score => score === null);
            thruStatus = lastRoundIndex === -1 ? 'F' : `R${lastRoundIndex}`;
        }
        
        // Process each round
        for (let i = 0; i < 4; i++) {
            let roundScore = rounds[i];
            
            // Apply MC/WD rules
            if (roundScore === null) {
                if (playerData.status === 'MC' || playerData.status === 'WD') {
                    roundScore = WD_MC_SCORE;
                } else {
                    // Active player hasn't played this round yet
                    break;
                }
            }
            
            const roundPar = roundScore - COURSE_PAR;
            
            rounds_strokes.push(roundScore);
            rounds_par.push(roundPar);
            
            total_strokes += roundScore;
            total_par_numeric += roundPar;
            
            cumulative_strokes.push(total_strokes);
            cumulative_par.push(total_par_numeric);
        }
        
        return {
            name: playerData.name,
            status: playerData.status,
            thruStatus,
            rounds_strokes,
            rounds_par,
            cumulative_strokes,
            cumulative_par,
            total_strokes,
            total_par_numeric,
            total_par_string: formatScoreRelPar(total_par_numeric)
        };
    }

    // Calculate participant's pool score
    function calculatePoolScore(participant, liveScores) {
        const players = [];
        
        // Process each of the 6 picks
        for (let i = 1; i <= 6; i++) {
            const playerName = participant[`Tier ${i}`];
            const liveData = liveScores.find(p => p.name === playerName);
            
            if (liveData) {
                const player = processPlayerScores(liveData);
                players.push(player);
            } else {
                // Player not found in live data (shouldn't happen with our sample data)
                players.push({
                    name: playerName,
                    status: 'Unknown',
                    thruStatus: '?',
                    rounds_strokes: [],
                    rounds_par: [],
                    cumulative_strokes: [],
                    cumulative_par: [],
                    total_strokes: 0,
                    total_par_numeric: 0,
                    total_par_string: '?'
                });
            }
        }
        
        // Sort players by total_par_numeric (ascending)
        players.sort((a, b) => a.total_par_numeric - b.total_par_numeric);
        
        // Identify the highest score (to drop) and the lowest (tiebreaker)
        const droppedPlayer = players[players.length - 1];
        const tiebreakerPlayer = players[0];
        
        // Mark these players
        droppedPlayer.isDropped = true;
        tiebreakerPlayer.isTiebreaker = true;
        
        // Calculate pool score (sum of best 5)
        const totalPoolScore_par = players.slice(0, -1).reduce((sum, player) => sum + player.total_par_numeric, 0);
        const totalPoolScore_strokes = players.slice(0, -1).reduce((sum, player) => sum + player.total_strokes, 0);
        
        return {
            name: participant.Name,
            players,
            totalPoolScore_par,
            totalPoolScore_strokes,
            totalPoolScore_par_string: formatScoreRelPar(totalPoolScore_par),
            tiebreakerScore_numeric: tiebreakerPlayer.total_par_numeric,
            tiebreakerScore_par_string: tiebreakerPlayer.total_par_string,
            thruStatus: players.some(p => p.thruStatus !== 'F') ? 
                players.filter(p => p.thruStatus !== 'F').map(p => p.thruStatus).join(', ') : 'F'
        };
    }

    // Generate HTML for a player's score details
    function generatePlayerScoreHTML(player, index) {
        const classes = [
            'player-score-details',
            'border',
            'rounded-lg',
            'p-4',
            'mb-4',
            player.isDropped ? 'dropped-player' : '',
            player.isTiebreaker ? 'tiebreaker-player' : ''
        ].join(' ');
        
        let statusBadge = '';
        if (player.status === 'MC') {
            statusBadge = '<span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">MC</span>';
        } else if (player.status === 'WD') {
            statusBadge = '<span class="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded">WD</span>';
        } else if (player.thruStatus !== 'F') {
            statusBadge = `<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">${player.thruStatus}</span>`;
        } else {
            statusBadge = '<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">F</span>';
        }
        
        let droppedIndicator = '';
        if (player.isDropped) {
            droppedIndicator = '<span class="bg-gray-200 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded ml-2">Dropped</span>';
        }
        
        let tiebreakerIndicator = '';
        if (player.isTiebreaker) {
            tiebreakerIndicator = '<span class="bg-masters-yellow text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded ml-2">Tiebreaker</span>';
        }
        
        // Generate rounds table
        let roundsHTML = '';
        if (player.rounds_strokes.length > 0) {
            roundsHTML = `
                <div class="score-table mt-4">
                    <table class="w-full text-sm text-left text-gray-500">
                        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" class="px-4 py-2">Round</th>
                                ${player.rounds_strokes.map((_, i) => `<th scope="col" class="px-4 py-2">R${i+1}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="bg-white border-b">
                                <th scope="row" class="px-4 py-2 font-medium text-gray-900">Strokes</th>
                                ${player.rounds_strokes.map(score => `<td class="px-4 py-2">${score}</td>`).join('')}
                            </tr>
                            <tr class="bg-white border-b">
                                <th scope="row" class="px-4 py-2 font-medium text-gray-900">To Par</th>
                                ${player.rounds_par.map(par => `<td class="px-4 py-2">${formatScoreRelPar(par)}</td>`).join('')}
                            </tr>
                            <tr class="bg-white">
                                <th scope="row" class="px-4 py-2 font-medium text-gray-900">Cumulative (Par)</th>
                                ${player.cumulative_par.map(par => `<td class="px-4 py-2">${formatScoreRelPar(par)}</td>`).join('')}
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        return `
            <div class="${classes}">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-masters-green">${player.name}</h4>
                        <div class="mt-1">
                            ${statusBadge}
                            ${droppedIndicator}
                            ${tiebreakerIndicator}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm">Total: ${player.total_strokes}</div>
                        <div class="text-lg font-bold ${player.total_par_numeric < 0 ? 'text-green-600' : player.total_par_numeric > 0 ? 'text-red-600' : 'text-gray-800'}">
                            ${player.total_par_string}
                        </div>
                    </div>
                </div>
                ${roundsHTML}
            </div>
        `;
    }

    // Generate HTML for a participant's entry
    function generateParticipantHTML(participant, rank) {
        const participantId = participant.name.replace(/\s+/g, '-').toLowerCase();
        
        return `
            <div class="participant-entry bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                <button class="participant-header w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 transition-colors" 
                        onclick="toggleParticipantDetails('${participantId}')">
                    <div class="flex items-center">
                        <span class="font-bold text-lg mr-4">${rank}</span>
                        <div>
                            <h3 class="font-bold text-masters-green">${participant.name}</h3>
                            <div class="text-sm text-gray-500">Thru: ${participant.thruStatus}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm">Total Score</div>
                        <div class="text-xl font-bold ${participant.totalPoolScore_par < 0 ? 'text-green-600' : participant.totalPoolScore_par > 0 ? 'text-red-600' : 'text-gray-800'}">
                            ${participant.totalPoolScore_par_string}
                        </div>
                        <div class="text-xs text-gray-500">Tiebreaker: ${participant.tiebreakerScore_par_string}</div>
                    </div>
                    <svg id="icon-${participantId}" class="w-5 h-5 text-gray-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                
                <div id="details-${participantId}" class="participant-details hidden p-4 border-t border-gray-200">
                    ${participant.players.map((player, index) => generatePlayerScoreHTML(player, index)).join('')}
                </div>
            </div>
        `;
    }

    // Toggle participant details
    window.toggleParticipantDetails = function(participantId) {
        const details = document.getElementById(`details-${participantId}`);
        const icon = document.getElementById(`icon-${participantId}`);
        
        details.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');
    };

    // Main function to load and process data
    async function loadLeaderboard() {
        try {
            // Load picks data from Supabase
            const { data: picksData, error: picksError } = await supabase
                .from('participants')
                .select('*')
            
            if (picksError) throw picksError
            
            // Fetch live scores
            const liveScores = await fetchLiveMastersScores()
            
            // Process each participant (transform data format if needed)
            const participants = picksData.map(pick => {
                // Transform from Supabase format to match existing code
                return {
                    Name: pick.name,
                    "Tier 1": pick.tier_1,
                    "Tier 2": pick.tier_2,
                    "Tier 3": pick.tier_3,
                    "Tier 4": pick.tier_4,
                    "Tier 5": pick.tier_5,
                    "Tier 6": pick.tier_6
                }
            }).map(pick => calculatePoolScore(pick, liveScores))
            
            // Sort participants by totalPoolScore_par (ascending), then tiebreakerScore_numeric (ascending)
            participants.sort((a, b) => {
                if (a.totalPoolScore_par !== b.totalPoolScore_par) {
                    return a.totalPoolScore_par - b.totalPoolScore_par;
                }
                return a.tiebreakerScore_numeric - b.tiebreakerScore_numeric;
            });
            
            // Generate leaderboard HTML
            const leaderboardHTML = participants.map((participant, index) => 
                generateParticipantHTML(participant, index + 1)
            ).join('');
            
            // Update the DOM
            document.getElementById('leaderboard-container').innerHTML = leaderboardHTML;
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('leaderboard').classList.remove('hidden');
            
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('error').classList.remove('hidden');
        }
    }

    // Start loading the leaderboard
    loadLeaderboard();
}); 