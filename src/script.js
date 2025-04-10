const supabaseUrl = 'https://nkedjevewyksuecoarcp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZWRqZXZld3lrc3VlY29hcmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNTE0ODMsImV4cCI6MjA1OTgyNzQ4M30.P7YY4hF5VzNwHGzQzc3c0RRTX5MZv2_Ac8xxynlooxs'
const supabase = supabaseJs.createClient(supabaseUrl, supabaseKey)

// Store channel reference globally so we can unsubscribe later
let realtimeChannel
// Flag to track if updates are available
let updatesAvailable = false

document.addEventListener('DOMContentLoaded', async function() {
    const COURSE_PAR = 72;
    const WD_MC_SCORE = 82; // Score assigned for WD/MC unplayed rounds
    
    // Helper function to format scores relative to par
    function formatScoreRelPar(score) {
        if (score === 0) return 'E';
        if (score < 0) return score.toString();
        return `+${score}`;
    }

    // Function to show the update notification
    function showUpdateNotification() {
        // Set flag to indicate updates are available
        updatesAvailable = true;
        
        // If notification already exists, don't create another one
        if (document.getElementById('update-notification')) {
            return;
        }
        
        // Add notification to the header
        const header = document.querySelector('header .container');
        
        // Create notification wrapper
        const notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.className = 'flex items-center bg-masters-yellow text-gray-800 rounded px-3 py-1';
        
        // Create notification text
        const notificationText = document.createElement('span');
        notificationText.textContent = 'Updates available';
        notificationText.className = 'text-sm mr-3';
        
        // Create refresh button
        const refreshButton = document.createElement('button');
        refreshButton.className = 'bg-white text-gray-800 text-xs px-2 py-1 rounded hover:bg-gray-100 transition';
        refreshButton.textContent = 'Refresh';
        refreshButton.onclick = applyUpdates;
        
        // Add elements to notification
        notification.appendChild(notificationText);
        notification.appendChild(refreshButton);
        
        // Add notification to the header
        header.appendChild(notification);
    }
    
    // Function to apply updates
    function applyUpdates() {
        if (updatesAvailable) {
            // Remove notification
            const notification = document.getElementById('update-notification');
            if (notification) {
                notification.remove();
            }
            
            // Reset flag
            updatesAvailable = false;
            
            // Store the expanded sections before refreshing
            const expandedSections = [];
            const detailSections = document.querySelectorAll('[id^="details-"]');
            
            detailSections.forEach(section => {
                if (!section.classList.contains('hidden')) {
                    expandedSections.push(section.id.replace('details-', ''));
                }
            });
            
            // Reload the data
            loadLeaderboard().then(() => {
                // Re-expand the sections that were expanded before
                expandedSections.forEach(id => {
                    const details = document.getElementById(`details-${id}`);
                    const icon = document.getElementById(`icon-${id}`);
                    
                    if (details && icon) {
                        details.classList.remove('hidden');
                        icon.classList.add('rotate-180');
                    }
                });
            });
        }
    }

    // Function to set up realtime subscription
    function setupRealtimeSubscription() {
        // Unsubscribe from any existing channel first
        if (realtimeChannel) {
            realtimeChannel.unsubscribe()
        }

        // Create a new subscription
        realtimeChannel = supabase
            .channel('public:players')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'players' }, 
                (payload) => {
                    console.log('Player data changed:', payload)
                    // Show notification instead of automatically refreshing
                    showUpdateNotification();
                }
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'participants' },
                (payload) => {
                    console.log('Participant data changed:', payload)
                    // Show notification instead of automatically refreshing
                    showUpdateNotification();
                }
            )
            .subscribe((status) => {
                console.log(`Realtime subscription status: ${status}`)
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to real-time updates')
                }
            })
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
        
        // Process each round - always process 4 rounds
        for (let i = 0; i < 4; i++) {
            let roundScore = rounds[i];
            
            // Apply MC/WD rules
            if (roundScore === null) {
                if (playerData.status === 'MC' || playerData.status === 'WD') {
                    roundScore = WD_MC_SCORE;
                    const roundPar = roundScore - COURSE_PAR;
                    rounds_strokes.push(roundScore);
                    rounds_par.push(roundPar);
                    total_strokes += roundScore;
                    total_par_numeric += roundPar;
                    cumulative_strokes.push(total_strokes);
                    cumulative_par.push(total_par_numeric);
                } else {
                    // Active player hasn't played this round yet - add placeholder
                    rounds_strokes.push('-');
                    rounds_par.push('-');
                    // Don't increment total for placeholder rounds
                    // Use the same cumulative value as the previous round or 0 if first round
                    cumulative_strokes.push(cumulative_strokes.length > 0 ? cumulative_strokes[cumulative_strokes.length-1] : 0);
                    cumulative_par.push(cumulative_par.length > 0 ? cumulative_par[cumulative_par.length-1] : 0);
                }
            } else {
                const roundPar = roundScore - COURSE_PAR;
                rounds_strokes.push(roundScore);
                rounds_par.push(roundPar);
                total_strokes += roundScore;
                total_par_numeric += roundPar;
                cumulative_strokes.push(total_strokes);
                cumulative_par.push(total_par_numeric);
            }
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
                // Add tier information to player
                player.tier = i;
                players.push(player);
            } else {
                // Player not found in live data (shouldn't happen with our sample data)
                players.push({
                    name: playerName,
                    status: 'Unknown',
                    thruStatus: '-',
                    rounds_strokes: ['-', '-', '-', '-'],
                    rounds_par: ['-', '-', '-', '-'],
                    cumulative_strokes: [0, 0, 0, 0],
                    cumulative_par: [0, 0, 0, 0],
                    total_strokes: 0,
                    total_par_numeric: 0,
                    total_par_string: '-',
                    tier: i
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
            thruStatus: players.every(p => p.thruStatus === '-') ? 
                '' : players.some(p => p.thruStatus !== 'F' && p.thruStatus !== '-') ? 
                players.filter(p => p.thruStatus !== 'F' && p.thruStatus !== '-').map(p => p.thruStatus).join(', ') : 
                players.some(p => p.thruStatus === 'F') ? 'F' : '',
            photo_url: participant.photo_url
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
        } else if (player.thruStatus !== 'F' && player.thruStatus !== '-') {
            statusBadge = `<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">${player.thruStatus}</span>`;
        } else if (player.thruStatus === 'F') {
            statusBadge = '<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">F</span>';
        }
        // No badge for players with thruStatus === '-' (no data available)
        
        let droppedIndicator = '';
        if (player.isDropped) {
            droppedIndicator = '<span class="bg-gray-200 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded ml-2">Dropped</span>';
        }
        
        let tiebreakerIndicator = '';
        if (player.isTiebreaker) {
            tiebreakerIndicator = '<span class="bg-masters-yellow text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded ml-2">Tiebreaker</span>';
        }
        
        // Add tier badge - different colors for different tiers
        const tierColors = {
            1: 'bg-purple-100 text-purple-800',
            2: 'bg-blue-100 text-blue-800',
            3: 'bg-green-100 text-green-800',
            4: 'bg-yellow-100 text-yellow-800',
            5: 'bg-orange-100 text-orange-800',
            6: 'bg-red-100 text-red-800'
        };
        
        const tierBadge = `<span class="${tierColors[player.tier]} text-xs font-medium px-2.5 py-0.5 rounded ml-2">Tier ${player.tier}</span>`;
        
        // Generate rounds table
        let roundsHTML = `
            <div class="score-table mt-4">
                <table class="w-full text-sm text-left text-gray-500">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" class="px-4 py-2">Round</th>
                            <th scope="col" class="px-4 py-2">R1</th>
                            <th scope="col" class="px-4 py-2">R2</th>
                            <th scope="col" class="px-4 py-2">R3</th>
                            <th scope="col" class="px-4 py-2">R4</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="bg-white border-b">
                            <th scope="row" class="px-4 py-2 font-medium text-gray-900">Strokes</th>
                            <td class="px-4 py-2">${player.rounds_strokes[0] || '-'}</td>
                            <td class="px-4 py-2">${player.rounds_strokes[1] || '-'}</td>
                            <td class="px-4 py-2">${player.rounds_strokes[2] || '-'}</td>
                            <td class="px-4 py-2">${player.rounds_strokes[3] || '-'}</td>
                        </tr>
                        <tr class="bg-white border-b">
                            <th scope="row" class="px-4 py-2 font-medium text-gray-900">To Par</th>
                            <td class="px-4 py-2">${player.rounds_par[0] === '-' ? '-' : formatScoreRelPar(player.rounds_par[0]) || '-'}</td>
                            <td class="px-4 py-2">${player.rounds_par[1] === '-' ? '-' : formatScoreRelPar(player.rounds_par[1]) || '-'}</td>
                            <td class="px-4 py-2">${player.rounds_par[2] === '-' ? '-' : formatScoreRelPar(player.rounds_par[2]) || '-'}</td>
                            <td class="px-4 py-2">${player.rounds_par[3] === '-' ? '-' : formatScoreRelPar(player.rounds_par[3]) || '-'}</td>
                        </tr>
                        <tr class="bg-white">
                            <th scope="row" class="px-4 py-2 font-medium text-gray-900">Cumulative (Par)</th>
                            <td class="px-4 py-2">${player.cumulative_par[0] === 0 && player.rounds_par[0] === '-' ? '-' : formatScoreRelPar(player.cumulative_par[0]) || '-'}</td>
                            <td class="px-4 py-2">${player.cumulative_par[1] === 0 && player.rounds_par[1] === '-' ? '-' : formatScoreRelPar(player.cumulative_par[1]) || '-'}</td>
                            <td class="px-4 py-2">${player.cumulative_par[2] === 0 && player.rounds_par[2] === '-' ? '-' : formatScoreRelPar(player.cumulative_par[2]) || '-'}</td>
                            <td class="px-4 py-2">${player.cumulative_par[3] === 0 && player.rounds_par[3] === '-' ? '-' : formatScoreRelPar(player.cumulative_par[3]) || '-'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        return `
            <div class="${classes}">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-masters-green">${player.name}</h4>
                        <div class="mt-1">
                            ${statusBadge}
                            ${tierBadge}
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
        
        // Get initials for avatar
        const nameWords = participant.name.split(' ');
        const initials = nameWords.map(word => word.charAt(0).toUpperCase()).join('');
        
        // Generate a consistent color based on the participant's name
        const hue = Math.abs(participant.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360);
        const avatarBgColor = `hsl(${hue}, 70%, 40%)`;
        
        // Create avatar HTML - display image if available, otherwise show initials
        let avatarHtml;
        if (participant.photo_url) {
            avatarHtml = `
                <div class="player-image mr-3" style="background-image: url('${participant.photo_url}');"></div>
            `;
        } else {
            avatarHtml = `
                <div class="player-image mr-3" style="background-color: ${avatarBgColor}; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 16px;">
                    ${initials}
                </div>
            `;
        }
        
        return `
            <div class="participant-entry bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                <button class="participant-header w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 transition-colors" 
                        onclick="toggleParticipantDetails('${participantId}')">
                    <div class="flex items-center">
                        <span class="font-bold text-lg mr-4">${rank}</span>
                        ${avatarHtml}
                        <div>
                            <h3 class="font-bold text-masters-green">${participant.name}</h3>
                            ${participant.thruStatus ? `<div class="text-sm text-gray-500">Thru: ${participant.thruStatus}</div>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center">
                        <div class="text-right mr-7">
                            <div class="text-sm text-right">Total Score</div>
                            <div class="text-xl font-bold text-right ${participant.totalPoolScore_par < 0 ? 'text-green-600' : participant.totalPoolScore_par > 0 ? 'text-red-600' : 'text-gray-800'}">
                                ${participant.totalPoolScore_par_string}
                            </div>
                            <div class="text-xs text-gray-500 text-right">Tiebreaker: ${participant.tiebreakerScore_par_string === '?' ? '-' : participant.tiebreakerScore_par_string}</div>
                        </div>
                        <svg id="icon-${participantId}" class="w-5 h-5 text-gray-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
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
                    "Tier 6": pick.tier_6,
                    photo_url: pick.photo_url
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
            
            // Return a promise for chaining
            return Promise.resolve();
            
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('error').classList.remove('hidden');
            
            // Return a rejected promise
            return Promise.reject(error);
        }
    }
    
    // Start loading the leaderboard
    loadLeaderboard();
    
    // Setup realtime subscription after initial load
    setupRealtimeSubscription();
    
    // Clean up subscription when page unloads
    window.addEventListener('beforeunload', () => {
        if (realtimeChannel) {
            realtimeChannel.unsubscribe()
        }
    });
}); 