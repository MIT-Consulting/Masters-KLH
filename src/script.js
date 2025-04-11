const supabaseUrl = 'https://nkedjevewyksuecoarcp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZWRqZXZld3lrc3VlY29hcmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNTE0ODMsImV4cCI6MjA1OTgyNzQ4M30.P7YY4hF5VzNwHGzQzc3c0RRTX5MZv2_Ac8xxynlooxs'
const supabase = supabaseJs.createClient(supabaseUrl, supabaseKey)

// Store channel reference globally so we can unsubscribe later
let realtimeChannel
// Flag to track if updates are available
let updatesAvailable = false

// Theme management
const THEME_KEY = 'masters-pool-theme';
const themes = ['light', 'dark', 'system'];
let currentThemeIndex = 2; // Default to system theme

// Function to initialize theme
function initializeTheme() {
    // Get saved theme from localStorage or default to system
    const savedTheme = localStorage.getItem(THEME_KEY) || 'system';
    currentThemeIndex = themes.indexOf(savedTheme);
    if (currentThemeIndex === -1) currentThemeIndex = 2; // Fallback to system if invalid
    setTheme(themes[currentThemeIndex]);
}

// Function to apply the theme to the document
function applyTheme(theme) {
    const htmlElement = document.documentElement;
    htmlElement.setAttribute('data-theme', theme);
    
    // If system theme, check user preference
    if (theme === 'system') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    } else if (theme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }

    // Update the theme icons
    updateThemeIcons(theme);
}

// Function to update the theme icons
function updateThemeIcons(theme) {
    // Hide all theme icons
    document.querySelectorAll('.theme-icon').forEach(icon => {
        icon.classList.add('hidden');
    });
    
    // Show the current theme icon
    const currentIcon = document.querySelector(`.theme-icon-${theme}`);
    if (currentIcon) {
        currentIcon.classList.remove('hidden');
    }
    
    // Update the theme text
    const themeText = document.querySelector('.theme-text');
    if (themeText) {
        themeText.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
    }
}

// Function to set the theme
function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    showThemeNotification(theme);
}

// Function to show theme notification
function showThemeNotification(theme) {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.theme-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    
    // Theme icon
    const iconDiv = document.createElement('div');
    iconDiv.className = 'theme-toggle-icon';
    
    let iconSvg;
    if (theme === 'light') {
        iconSvg = '<svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>';
    } else if (theme === 'dark') {
        iconSvg = '<svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>';
    } else {
        iconSvg = '<svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" /></svg>';
    }
    
    iconDiv.innerHTML = iconSvg;
    
    const text = document.createElement('span');
    text.textContent = `${theme.charAt(0).toUpperCase() + theme.slice(1)} mode activated`;
    
    notification.appendChild(iconDiv);
    notification.appendChild(text);
    document.body.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        
        // Remove from DOM after animation completes
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Function to toggle theme
function toggleTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    setTheme(themes[currentThemeIndex]);
}

// Set up system theme change detection
function setupSystemThemeDetection() {
    if (window.matchMedia) {
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeMediaQuery.addEventListener('change', (e) => {
            // Only update if we're using system theme
            if (document.documentElement.getAttribute('data-theme') === 'system') {
                if (e.matches) {
                    document.body.classList.add('dark');
                } else {
                    document.body.classList.remove('dark');
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const COURSE_PAR = 72;
    const WD_MC_SCORE = 82; // Score assigned for WD/MC unplayed rounds
    
    // Initialize theme
    initializeTheme();
    setupSystemThemeDetection();
    
    // Set up theme toggle click handler
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Set initial sticky offset after a brief delay and add resize listener
    setTimeout(setStickyHeaderOffset, 0); // Delay calculation slightly
    window.addEventListener('resize', setStickyHeaderOffset);
    
    // Helper function to format scores relative to par
    function formatScoreRelPar(score) {
        // Ensure score is a number before processing
        const numericScore = Number(score);
        if (isNaN(numericScore)) return '-'; // Return dash if score is not a number
        if (numericScore === 0) return 'E';
        if (numericScore < 0) return numericScore.toString();
        return `+${numericScore}`;
    }

    // Helper function to parse 'total' which might be 'E' or a number string
    function parseTotalScore(total) {
        if (total === 'E') return 0;
        const score = parseInt(total, 10);
        return isNaN(score) ? 0 : score; // Default to 0 if parsing fails
    }

    // Function to apply updates (now shows spinner)
    function applyUpdates() {
        const spinner = document.getElementById('update-spinner');
        if (!spinner) return; // Guard against missing element

        spinner.classList.remove('hidden'); // Show spinner

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
                const participantEntry = document.querySelector(`#details-${id}`)?.closest('.participant-entry');
                const playerImage = participantEntry?.querySelector('.player-image');

                if (details && icon) {
                    details.classList.remove('hidden');
                    icon.classList.add('rotate-180');
                    // Re-apply expanded styles if they exist
                    if (participantEntry) participantEntry.classList.add('expanded');
                    if (playerImage) playerImage.classList.add('player-image-expanded');
                }
            });

            // Hide spinner after 500ms
            setTimeout(() => {
                spinner.classList.add('hidden');
            }, 500);

        }).catch(error => {
            // Handle errors during leaderboard load if necessary
            console.error("Error applying updates:", error);
            // Hide spinner even if there's an error
            spinner.classList.add('hidden'); 
            // Optionally show an error message/toast here
        });
    }

    // Function to set up realtime subscription
    function setupRealtimeSubscription() {
        // Unsubscribe from any existing channel first
        if (realtimeChannel) {
            realtimeChannel.unsubscribe()
        }

        // Create a new subscription to espn_golf_scores
        realtimeChannel = supabase
            .channel('public:espn_golf_scores') // Changed channel name
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'espn_golf_scores' }, // Changed table name
                (payload) => {
                    console.log('ESPN Golf Score data changed:', payload)
                    applyUpdates(); // Call applyUpdates directly
                }
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'participants' },
                (payload) => {
                    console.log('Participant data changed:', payload)
                    applyUpdates(); // Call applyUpdates directly
                }
            )
            .subscribe((status) => {
                console.log(`Realtime subscription status: ${status}`)
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to real-time updates for espn_golf_scores and participants')
                }
            })
    }

    // Function to fetch live scores from espn_golf_scores table
    async function fetchLiveMastersScores() {
        const { data, error } = await supabase
            .from('espn_golf_scores') // Changed table name
            .select('*')

        if (error) throw error
        return data
    }

    // Process player scores using data from espn_golf_scores
    function processPlayerScores(playerData) {
        const rounds_strokes = [];
        const rounds_par = [];
        const cumulative_strokes = [];
        const cumulative_par = [];
        let calculated_total_strokes = 0;
        let calculated_total_par_numeric = 0;

        // Determine player status based on espn_golf_scores data
        // Use thru field to determine status (e.g., F, WD, MC, tee time, hole number)
        const thru = playerData.thru || '';
        let status = '';
        if (thru.toUpperCase() === 'F') status = 'F';
        else if (thru.toUpperCase() === 'WD') status = 'WD';
        else if (thru.toUpperCase() === 'CUT') status = 'MC'; // Assuming 'CUT' maps to 'MC'

        const isFinal = status === 'F';
        const isWithdrawn = status === 'WD';
        const isCut = status === 'MC';
        const isActive = !isFinal && !isWithdrawn && !isCut && thru && !/\d{1,2}:\d{2}\s*(?:AM|PM)?/i.test(thru); // Active if thru exists and is not a tee time

        // Use live data from espn_golf_scores
        // Use to_par for numeric par score, total for raw strokes
        let live_total_par_numeric = parseTotalScore(playerData.to_par); // Use to_par
        let live_total_strokes = parseTotalScore(playerData.total); // Use total for strokes
        let live_thruStatus = thru || '-';
        let live_today_score = playerData.today ? formatScoreRelPar(playerData.today) : '-';

        // Reconstruct rounds array from r1, r2, r3, r4 columns
        const rounds = [playerData.r1, playerData.r2, playerData.r3, playerData.r4];

        // Process each round based on reconstructed rounds data
        for (let i = 0; i < 4; i++) {
            let roundScore = rounds[i];

            // Check if roundScore is a valid number
            if (roundScore !== null && roundScore !== undefined && !isNaN(Number(roundScore))) {
                roundScore = Number(roundScore); // Ensure it's a number
                const roundPar = roundScore - COURSE_PAR;
                rounds_strokes.push(roundScore);
                rounds_par.push(roundPar);
                calculated_total_strokes += roundScore;
                calculated_total_par_numeric += roundPar;
                cumulative_strokes.push(calculated_total_strokes);
                cumulative_par.push(calculated_total_par_numeric);
            } else {
                // Handle incomplete rounds or WD/MC based on determined status
                if (isWithdrawn || isCut) {
                    roundScore = WD_MC_SCORE;
                    const roundPar = roundScore - COURSE_PAR;
                    rounds_strokes.push(roundScore);
                    rounds_par.push(roundPar);
                    // Only add WD/MC score if it hasn't been added yet
                    if (rounds_strokes.filter(s => s === WD_MC_SCORE).length <= (i + 1 - rounds_strokes.filter(s => s !== '-' && s !== WD_MC_SCORE).length)) {
                         calculated_total_strokes += roundScore;
                         calculated_total_par_numeric += roundPar;
                    }
                    cumulative_strokes.push(calculated_total_strokes);
                    cumulative_par.push(calculated_total_par_numeric);
                } else {
                    // Player is active or hasn't started this round yet
                    rounds_strokes.push('-');
                    rounds_par.push('-');
                    cumulative_strokes.push(cumulative_strokes.length > 0 ? cumulative_strokes[cumulative_strokes.length - 1] : calculated_total_strokes);
                    cumulative_par.push(cumulative_par.length > 0 ? cumulative_par[cumulative_par.length - 1] : calculated_total_par_numeric);
                }
            }
        }

        // Determine final values to return, prioritizing live data
        let final_total_par_numeric;
        let final_total_strokes;
        let final_thruStatus = live_thruStatus;
        let final_today_score = live_today_score;
        let final_status = status; // Use status derived from 'thru'

        if (isFinal || isWithdrawn || isCut) {
            final_total_par_numeric = calculated_total_par_numeric;
            final_total_strokes = calculated_total_strokes;
            final_status = status; // Use F, WD, MC
            final_thruStatus = status; // Display F, WD, MC as thru status too
        } else if (isActive || /\d{1,2}:\d{2}\s*(?:AM|PM)?/i.test(thru)) { // If active or has tee time
            final_total_par_numeric = live_total_par_numeric; // Use live to_par
            final_total_strokes = live_total_strokes;         // Use live total strokes
            final_thruStatus = live_thruStatus;             // Use live thru status
            final_status = ''; // No definitive F/WD/MC status yet
        } else {
            // Player hasn't started or data is missing/invalid
            final_total_par_numeric = 0;
            final_total_strokes = 0;
            final_thruStatus = '-';
            final_today_score = '-';
            final_status = '';
        }

        // Ensure total strokes isn't NaN if live_total_strokes was invalid
        if (isNaN(final_total_strokes)) {
             final_total_strokes = calculated_total_strokes; // Fallback to calculated
        }

        return {
            name: playerData.player_name, // Use player_name
            status: final_status,       // Status derived from 'thru' (F, WD, MC, or blank)
            thruStatus: final_thruStatus, // More detailed live status (Thru 14, F, WD, MC, Tee Time, -)
            todayScore: final_today_score, // Score for the current day
            rounds_strokes,
            rounds_par,
            cumulative_strokes,
            cumulative_par,
            total_strokes: final_total_strokes,
            total_par_numeric: final_total_par_numeric,
            total_par_string: formatScoreRelPar(final_total_par_numeric)
        };
    }

    // Calculate participant's pool score
    function calculatePoolScore(participant, liveScores) {
        const players = [];
        let activePlayerCount = 0;
        let finishedPlayerCount = 0;
        let cutPlayerCount = 0;
        let withdrawnPlayerCount = 0;
        let notStartedCount = 0;
        let teeTimeCount = 0;

        // Process each of the 6 picks
        for (let i = 1; i <= 6; i++) {
            const participantPlayerName = participant[`Tier ${i}`];
            // Find player in liveScores using player_name
            const liveData = liveScores.find(p => p.player_name === participantPlayerName);

            if (liveData) {
                const player = processPlayerScores(liveData);
                // Add tier information to player
                player.tier = i;
                players.push(player);

                // Tally player statuses for participant summary
                if (player.status === 'F') finishedPlayerCount++;
                else if (player.status === 'MC') cutPlayerCount++;
                else if (player.status === 'WD') withdrawnPlayerCount++;
                else if (/\d{1,2}:\d{2}\s*(?:AM|PM)?/i.test(player.thruStatus)) teeTimeCount++; // Has tee time
                else if (player.thruStatus && player.thruStatus !== '-') activePlayerCount++; // Active on course
                else notStartedCount++;

            } else {
                // Player not found in live data
                console.warn(`Player ${participantPlayerName} not found in espn_golf_scores`);
                players.push({
                    name: participantPlayerName,
                    status: 'Unknown',
                    thruStatus: 'MISSING',
                    todayScore: '-',
                    rounds_strokes: ['-', '-', '-', '-'],
                    rounds_par: ['-', '-', '-', '-'],
                    cumulative_strokes: [0, 0, 0, 0],
                    cumulative_par: [0, 0, 0, 0],
                    total_strokes: 0,
                    total_par_numeric: 0,
                    total_par_string: 'MISSING',
                    tier: i,
                    isMissing: true // Flag missing players
                });
                notStartedCount++; // Count as not started for summary purposes
            }
        }

        // Sort players by total_par_numeric (ascending), handle MISSING scores
        players.sort((a, b) => {
             // Treat missing/unknown scores as very high
             const scoreA = a.isMissing ? Infinity : a.total_par_numeric;
             const scoreB = b.isMissing ? Infinity : b.total_par_numeric;
             return scoreA - scoreB;
        });

        // Identify the highest score (to drop) and the lowest (tiebreaker)
        // Ensure droppedPlayer and tiebreakerPlayer are assigned only if players exist
        let droppedPlayer = null;
        let tiebreakerPlayer = null;
        if (players.length > 0) {
            droppedPlayer = players[players.length - 1];
            tiebreakerPlayer = players[0];
            // Mark players, checking if they exist first
            if (droppedPlayer) droppedPlayer.isDropped = true;
            if (tiebreakerPlayer) tiebreakerPlayer.isTiebreaker = true;
        }


        // Calculate pool score (sum of best 5), excluding missing players from sum
        const playersToCount = players.filter(p => !p.isDropped && !p.isMissing);
        const totalPoolScore_par = playersToCount.reduce((sum, player) => sum + player.total_par_numeric, 0);
        // Calculate total strokes only if all counted players have valid stroke data
        const totalPoolScore_strokes = playersToCount.every(p => typeof p.total_strokes === 'number')
            ? playersToCount.reduce((sum, player) => sum + player.total_strokes, 0)
            : '-'; // Indicate if strokes can't be summed accurately

        // Generate participant thru status summary
        let participantThruSummary = [];
        if (activePlayerCount > 0) participantThruSummary.push(`${activePlayerCount} Active`);
        if (teeTimeCount > 0) participantThruSummary.push(`${teeTimeCount} Tee Time`);
        if (finishedPlayerCount > 0) participantThruSummary.push(`${finishedPlayerCount} F`);
        if (cutPlayerCount > 0) participantThruSummary.push(`${cutPlayerCount} MC`);
        if (withdrawnPlayerCount > 0) participantThruSummary.push(`${withdrawnPlayerCount} WD`);
        if (notStartedCount > 0 && participantThruSummary.length === 0) participantThruSummary.push('Not Started');
        const finalParticipantThruStatus = participantThruSummary.join(', ');

        // Handle missing tiebreaker
        const tiebreakerScoreNumeric = tiebreakerPlayer && !tiebreakerPlayer.isMissing ? tiebreakerPlayer.total_par_numeric : Infinity;
        const tiebreakerScoreString = tiebreakerPlayer && !tiebreakerPlayer.isMissing ? tiebreakerPlayer.total_par_string : '-';

        return {
            name: participant.Name,
            players,
            totalPoolScore_par,
            totalPoolScore_strokes,
            totalPoolScore_par_string: formatScoreRelPar(totalPoolScore_par),
            tiebreakerScore_numeric: tiebreakerScoreNumeric,
            tiebreakerScore_par_string: tiebreakerScoreString,
            thruStatus: finalParticipantThruStatus, // Updated summary
            photo_url: participant.photo_url
        };
    }

    // Generate HTML for a player's score details
    function generatePlayerScoreHTML(player, index) {
        const classes = [
            'player-score-details',
            'border',
            'border-color',
            'rounded-lg',
            'p-4',
            'mb-4',
            'card-bg',
            player.isDropped ? 'dropped-player' : '',
            player.isTiebreaker ? 'tiebreaker-player' : ''
        ].join(' ');

        // Determine if the player is actively playing (not F, WD, MC, or just a tee time)
        const isActive = !['F', 'WD', 'MC', '-'].includes(player.status) && 
                         player.thruStatus && 
                         !/\d{1,2}:\d{2}\s*(?:AM|PM)?/i.test(player.thruStatus) &&
                         !['F', 'WD', 'MC', '-'].includes(player.thruStatus);

        // Prepare live score string for active players
        let liveScoreInfo = '';
        if (isActive && player.todayScore && player.todayScore !== '-') {
             const todayScoreClass = parseInt(player.todayScore) < 0 ? 'text-green-600' : parseInt(player.todayScore) > 0 ? 'text-red-600' : 'text-gray-500'; // Use gray for E
             const thruText = player.thruStatus.includes('Thru') ? player.thruStatus : `thru ${player.thruStatus}`;
             liveScoreInfo = ` <span class="text-sm font-normal ${todayScoreClass}">(Today: ${player.todayScore} ${thruText})</span>`;
        }

        let statusContent = '';
        // Determine primary status badge (excluding Today score)
        if (player.status === 'MC') {
            statusContent = '<span class="badge bg-red-100 text-red-800">MC</span>';
        } else if (player.status === 'WD') {
            statusContent = '<span class="badge bg-orange-100 text-orange-800">WD</span>';
        } else if (player.status === 'F') {
            statusContent = '<span class="badge bg-green-100 text-green-800">F</span>';
        } else if (player.thruStatus && player.thruStatus !== '-') {
            let thruText = player.thruStatus;
            const isTeeTime = /\d{1,2}:\d{2}\s*(?:AM|PM)?/i.test(thruText);
            if (isTeeTime) {
                statusContent = `<span class="badge bg-gray-200 text-gray-800">${thruText}</span>`; // Tee time
            } else if (isActive) {
                 // Active on course - show thru status if not already next to name
                 // Generally covered by liveScoreInfo now, but keep badge for consistency if needed?
                 // Or just show the blue badge if liveScoreInfo is empty?
                 if (!liveScoreInfo) { // Only show blue badge if live info isn't displayed by name
                     statusContent = `<span class="badge bg-blue-100 text-blue-800">${thruText}</span>`;
                 }
            } else if (player.thruStatus === 'F') { // Handle case where status isn't F but thru is F (end of day)
                 statusContent = '<span class="badge bg-green-100 text-green-800">F*</span>'; // Indicate finished for day
            }
        } else {
             statusContent = '<span class="badge bg-gray-100 text-gray-600">-</span>'; // Not started or unknown
        }

        let droppedIndicator = '';
        if (player.isDropped) {
            droppedIndicator = '<span class="badge bg-gray-200 text-gray-800 ml-2">Dropped</span>';
        }

        let tiebreakerIndicator = '';
        if (player.isTiebreaker) {
            tiebreakerIndicator = '<span class="badge bg-masters-yellow text-gray-800 ml-2">Tiebreaker</span>';
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

        const tierBadge = `<span class="badge ${tierColors[player.tier]} ml-2">Tier ${player.tier}</span>`;

        // Simplify badge class usage - Tailwind should handle this
        const badgeBaseClass = "text-xs font-medium px-2.5 py-0.5 rounded";
        statusContent = statusContent.replace(/class="badge /g, `class="${badgeBaseClass} `);
        droppedIndicator = droppedIndicator.replace(/class="badge /g, `class="${badgeBaseClass} `);
        tiebreakerIndicator = tiebreakerIndicator.replace(/class="badge /g, `class="${badgeBaseClass} `);
        const tierBadgeHtml = tierBadge.replace(/class="badge /g, `class="${badgeBaseClass} `);

        // Generate rounds table
        let roundsHTML = `
            <div class="score-table mt-4">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs uppercase bg-opacity-50 bg-gray-200">
                        <tr>
                            <th scope="col" class="px-4 py-2">Round</th>
                            <th scope="col" class="px-4 py-2">R1</th>
                            <th scope="col" class="px-4 py-2">R2</th>
                            <th scope="col" class="px-4 py-2">R3</th>
                            <th scope="col" class="px-4 py-2">R4</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="card-bg border-b border-color">
                            <th scope="row" class="px-4 py-2 font-medium">Strokes</th>
                            <td class="px-4 py-2">${player.rounds_strokes[0] || '-'}</td>
                            <td class="px-4 py-2">${player.rounds_strokes[1] || '-'}</td>
                            <td class="px-4 py-2">${player.rounds_strokes[2] || '-'}</td>
                            <td class="px-4 py-2">${player.rounds_strokes[3] || '-'}</td>
                        </tr>
                        <tr class="card-bg border-b border-color">
                            <th scope="row" class="px-4 py-2 font-medium">To Par</th>
                            <td class="px-4 py-2">${player.rounds_par[0] === '-' ? '-' : formatScoreRelPar(player.rounds_par[0]) || '-'}</td>
                            <td class="px-4 py-2">${player.rounds_par[1] === '-' ? '-' : formatScoreRelPar(player.rounds_par[1]) || '-'}</td>
                            <td class="px-4 py-2">${player.rounds_par[2] === '-' ? '-' : formatScoreRelPar(player.rounds_par[2]) || '-'}</td>
                            <td class="px-4 py-2">${player.rounds_par[3] === '-' ? '-' : formatScoreRelPar(player.rounds_par[3]) || '-'}</td>
                        </tr>
                        <tr class="card-bg">
                            <th scope="row" class="px-4 py-2 font-medium">Cumulative (Par)</th>
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
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-grow mr-2">
                        <h4 class="font-medium text-masters-green">${player.name}${liveScoreInfo}</h4>
                        <div class="mt-1 flex flex-wrap gap-1">
                            ${statusContent}
                            ${tierBadgeHtml}
                            ${droppedIndicator}
                            ${tiebreakerIndicator}
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0 ml-auto">
                        <div class="text-sm">Total: ${player.total_strokes !== null ? player.total_strokes : '-'}</div>
                        <div class="text-lg font-medium ${player.total_par_numeric < 0 ? 'text-green-600' : player.total_par_numeric > 0 ? 'text-red-600' : ''}">
                            ${player.total_par_string}
                        </div>
                    </div>
                </div>
                ${roundsHTML}
            </div>
        `;
    }

    // Generate HTML for a participant's entry
    function generateParticipantHTML(participant) {
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
            <div class="participant-entry rounded-lg shadow-md border">
                <button class="participant-header w-full flex justify-between items-center p-4 text-left transition-colors" 
                        onclick="toggleParticipantDetails('${participantId}')">
                    <div class="flex items-center">
                        <span class="participant-rank text-lg mr-4">${participant.displayRank}</span>
                        ${avatarHtml}
                        <div>
                            <h3 class="text-masters-green font-medium">${participant.name}</h3>
                            <div class="text-xs text-gray-500 mt-1">
                                ${participant.thruStatus ? participant.thruStatus : ''}
                                ${participant.thruStatus && participant.tiebreakerScore_par_string !== '-' ? ', ' : ''} 
                                ${participant.tiebreakerScore_par_string !== '-' ? `Tiebreaker: ${participant.tiebreakerScore_par_string}` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center">
                        <div class="text-right mr-4">
                            <div class="text-sm text-right">Pool Score</div>
                            <div class="text-xl text-right font-medium ${participant.totalPoolScore_par < 0 ? 'text-green-600' : participant.totalPoolScore_par > 0 ? 'text-red-600' : ''}">
                                ${participant.totalPoolScore_par_string}
                            </div>
                        </div>
                        <svg id="icon-${participantId}" class="w-5 h-5 text-gray-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                </button>
                
                <div id="details-${participantId}" class="participant-details hidden p-4 border-t border-color">
                    ${participant.players.map((player, index) => generatePlayerScoreHTML(player, index)).join('')}
                </div>
            </div>
        `;
    }

    // Function to calculate and set the sticky header offset
    function setStickyHeaderOffset() {
        const header = document.querySelector('body > header');
        if (header) {
            // Use getBoundingClientRect for potentially more accurate height
            const headerHeight = header.getBoundingClientRect().height;
            document.documentElement.style.setProperty('--sticky-header-top', `${headerHeight}px`);
            console.log(`Sticky header top offset set to: ${headerHeight}px`);
        } else {
            console.error("Main header element not found for offset calculation.");
        }
    }

    // Toggle participant details
    window.toggleParticipantDetails = function(participantId) {
        const clickedDetails = document.getElementById(`details-${participantId}`);
        const clickedIcon = document.getElementById(`icon-${participantId}`);
        const clickedEntry = clickedDetails.closest('.participant-entry');
        const clickedPlayerImage = clickedEntry?.querySelector('.player-image');

        // Check if the clicked one is currently hidden (meaning we intend to open it)
        const isOpening = clickedDetails.classList.contains('hidden');

        // First, close all participant details sections
        const allEntries = document.querySelectorAll('.participant-entry');
        allEntries.forEach(entry => {
            const entryId = entry.querySelector('[id^="details-"]')?.id.replace('details-', '');
            if (entryId) {
                const details = entry.querySelector(`#details-${entryId}`);
                const icon = entry.querySelector(`#icon-${entryId}`);
                const playerImage = entry.querySelector('.player-image');
                const participantEntryDiv = entry; // The entry itself

                if (details && !details.classList.contains('hidden')) {
                    details.classList.add('hidden');
                    if (icon) icon.classList.remove('rotate-180');
                    if (playerImage) playerImage.classList.remove('player-image-expanded');
                    if (participantEntryDiv) participantEntryDiv.classList.remove('expanded');
                }
            }
        });

        // If we were intending to open the clicked one, open it now
        if (isOpening) {
            clickedDetails.classList.remove('hidden');
            if (clickedIcon) clickedIcon.classList.add('rotate-180');
            if (clickedPlayerImage) clickedPlayerImage.classList.add('player-image-expanded');
            if (clickedEntry) clickedEntry.classList.add('expanded');
            
            // Find the first player record within the details
            const firstDetailRecord = clickedDetails.querySelector('.player-score-details');
            
            if (firstDetailRecord) {
                // Use setTimeout to ensure DOM is updated before scrolling
                setTimeout(() => {
                    // Get the participant header height
                    const participantHeader = clickedEntry.querySelector('.participant-header');
                    const participantHeaderHeight = participantHeader ? participantHeader.getBoundingClientRect().height : 0;
                    
                    // Add a larger buffer for visual clarity
                    const scrollOffset = participantHeaderHeight + 25;
                    
                    // Get the position of the first detail record
                    const firstDetailRect = firstDetailRecord.getBoundingClientRect();
                    
                    // Check if the first detail record is not fully visible or covered by the header
                    const isOffscreen = firstDetailRect.top < scrollOffset || 
                                        firstDetailRect.bottom > window.innerHeight;
                    
                    if (isOffscreen) {
                        // Scroll the first detail record into view with offset for the participant header
                        window.scrollTo({
                            top: window.scrollY + firstDetailRect.top - scrollOffset,
                            behavior: 'smooth'
                        });
                    }
                }, 50); // Small delay to ensure DOM update
            }
        }
        // If we were clicking an already open one, the loop above already closed it.
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

            // Calculate ranks with tie handling
            let currentRank = 0;
            let actualRank = 0;
            let prevScore = null;
            let prevTiebreaker = null;

            participants.forEach((participant, index) => {
                actualRank++; // Increments for each person regardless of score
                // Update the rank number only if the current participant's score/tiebreaker is different from the previous one
                if (participant.totalPoolScore_par !== prevScore || participant.tiebreakerScore_numeric !== prevTiebreaker) {
                    currentRank = actualRank; // Set the new rank number
                    prevScore = participant.totalPoolScore_par;
                    prevTiebreaker = participant.tiebreakerScore_numeric;
                }
                participant.rankValue = currentRank; // Store the numeric rank for tie checking
            });

            // Add 'T' for ties
            participants.forEach((participant, index) => {
                let isTied = false;
                // Check if the next participant has the same rank value
                if (index + 1 < participants.length && participants[index + 1].rankValue === participant.rankValue) {
                    isTied = true;
                }
                // Check if the previous participant has the same rank value
                if (index > 0 && participants[index - 1].rankValue === participant.rankValue) {
                    isTied = true;
                }
                // Assign the final display rank string (e.g., "1", "2T")
                participant.displayRank = participant.rankValue + (isTied ? 'T' : '');
            });
            
            // Generate leaderboard HTML using the calculated displayRank
            const leaderboardHTML = participants.map(participant => 
                generateParticipantHTML(participant) // Pass the participant object with the new displayRank property
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