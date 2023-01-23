
module.exports = function(app){
    const cors = require("cors");
    require('dotenv').config()
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DB_STRING,
    });
    pool.connect()
    const corsOptions = {
        origin: ['http://localhost:3000', 'http://cs-reference']
      }
      
    app.use(cors(corsOptions)) 


    app.get("/", async (req, res, next)=> { 
        let lastDate = await getLastDate();
        let lastMatchDayIDs = await getMatchIDs(lastDate);
        let matchData = await getMatchData(lastMatchDayIDs);
        let beforeAndAfterDates = await getDateBeforeAfter(lastDate);
        res.render("pages/index", {date: new Date(lastDate).toLocaleDateString("en-US", {year: 'numeric', month: 'long', day: 'numeric'}), beforeAndAfter: beforeAndAfterDates, matches: matchData, matchIDs: lastMatchDayIDs}); 
    });
      

    app.get("/date/:date", async (req, res)=> { 
        let day = req.params.date;
        let matchDayIDs = await getMatchIDs(day);
        let matchData = await getMatchData(matchDayIDs);
        let beforeAndAfterDates = await getDateBeforeAfter(day);
        res.render("pages/index", {date: new Date(day).toLocaleDateString("en-US", {year: 'numeric', month: 'long', day: 'numeric'}), beforeAndAfter: beforeAndAfterDates, matches: matchData, matchIDs: matchDayIDs});
    });

    app.get("/match/:match", async (req, res)=> { 
        matchID = parseInt(req.params.match)+2356097
        let matchData = await getMapData(matchID);
        res.render("pages/match", {maps: matchData, matchID: matchID-2356097, date: new Date(matchData[0].date).toLocaleDateString("en-US", {year: 'numeric', month: 'long', day: 'numeric'})});
    });

    // app.get("/tournaments/:page?", async (req, res)=> { 
    //     let page = req.params.page ? req.params.page:0;
    //     let tournaments = getTournaments(page)
    //     let beforeAndAfterPages = [page+1, page-1]
    //     res.render("pages/tournaments", {tournaments: tournaments, page: beforeAndAfterPages});
    // });

    // app.get("/tournament/:tournament", async (req, res)=> { 
    //     tournamentID = parseInt(req.params.tournament)+6384
    //     let tournamentData = await getTournamentData(tournamentID);
    //     res.render("pages/tournament", {tournament: tournamentData, tournamentID: tournament-6384, date: new Date(tournamentData[0].date).toLocaleDateString("en-US", {year: 'numeric', month: 'long', day: 'numeric'})});
    // });

    app.get("/about", async (req, res, next)=> { 
        res.render("pages/about");
    });
    app.get("/betting", async (req, res, next)=> { 
        res.render("pages/betting");
    });
    app.get("/definitions", async (req, res, next)=> { 
        res.render("pages/definitions");
    });
    app.get("/players", async (req, res, next)=> {
        res.render("pages/players");
    });



    //Fetch requests
    app.get("/data/players/", cors(), async (req, res) => {
        let playerData = await getPlayerSummaryData() 
        res.json(playerData)
    })
    app.get("/data/match/:id/", cors(), async (req, res) => {
        matchID = parseInt(req.params.id)+2356097
        let ChartData = await getMatchChartData(matchID);
        res.json(ChartData)
    })

    app.get("/data/match/:id/:map/", cors(), async (req, res) => {
        let id = parseInt(req.params.id);
        let map = parseInt(req.params.map);
        let SummaryData = await getMapSummaryData(id+2356097, map);
        res.json(SummaryData)
    })

    app.get("/data/match/:id/:map/:round/", cors(), async (req, res) => {
        let id = parseInt(req.params.id);
        let map = parseInt(req.params.map);
        let round = parseInt(req.params.round);
        let ChartData = await getRoundChartData(id+2356097, map, round);
        res.json(ChartData)
    })



    
    //Queries

    async function getLastDate(){
        const latestDateQuery = {
            text: "SELECT TO_CHAR(date, 'YYYY-MM-DD') as date from matches Match where exists(select 1 from roundstates RS inner join maps Map on Map.matchid = Match.matchid where RS.mapid = Map.mapid) and date > '2020-01-01'::date order by date DESC limit 1;"
        }
        const res = await pool.query(latestDateQuery)
        return res.rows[0].date
    }

    async function getDateBeforeAfter(date){
        ret = {}
        const beforeQuery = {
            text: "SELECT TO_CHAR(date, 'YYYY-MM-DD') as date from matches Match where exists(select 1 from roundstates RS inner join maps Map on Map.matchid = Match.matchid where RS.mapid = Map.mapid) and match.date < $1 and match.date > '2014-05-08'::date order by date DESC limit 1;",       
            values: [date],
        }
        const afterQuery = {
            text: "SELECT TO_CHAR(date, 'YYYY-MM-DD') as date from matches Match where exists(select 1 from roundstates RS inner join maps Map on Map.matchid = Match.matchid where RS.mapid = Map.mapid) and match.date > $1 order by date ASC limit 1;",       
            values: [date],
        }

        let res = await pool.query(beforeQuery);
        if(res.rows.length > 0){
            ret["before"] = res.rows[0].date;
        }

        res = await pool.query(afterQuery);
        if(res.rows.length > 0){
            ret["after"] = res.rows[0].date;
        }

        return ret
    }

    async function getMatchIDs(date){
        const matchesQuery = {
            text: "SELECT (matchid-2356097) as matchid from matches where date = $1 order by time DESC;",
            values: [date],
        } 
        const res = await pool.query(matchesQuery)
        return res.rows
    }

    async function getMatchData(matchIDs){
        let matches = {}
        for(var i=0; i < matchIDs.length; i++){
            let matchID = matchIDs[i];
            const Query = {
                text: "SELECT Mat.winner, Mat.loser, Mat.tournamentname from matches Mat where Mat.matchid = $1 limit 1;",
                values: [matchID.matchid+2356097],
            } 
            const res = await pool.query(Query);
            res.rows[0].winner = res.rows[0].winner.replaceAll("-", " ")
            res.rows[0].loser = res.rows[0].loser.replaceAll("-", " ")
            res.rows[0].tournamentname = res.rows[0].tournamentname.replaceAll("-", " ")
            matches[matchID.matchid] = res.rows[0];
        }
        return matches

    }

    async function getMatchChartData(matchID){
        const Query = {
            text: "SELECT Map.mapnumber, Map.mapname, CASE WHEN R.winner = T.teamid THEN R.winnerscore ELSE R.loserscore END as winnerscore, CASE WHEN R.winner = T.teamid THEN R.loserscore ELSE R.winnerscore END as loserscore, r.round, mp.tick, r.round+COALESCE(CASE WHEN mp.tick=0 then 1 else mp.tick end/nullif(MAX(mp.tick)OVER(PARTITION BY Map.mapnumber,r.round),0)::float,0) as roundProg, CASE WHEN Map.winnerstart='ct' THEN CASE WHEN T.teamid = Map.winnerid THEN mp.probct else 1-mp.probct END ELSE CASE WHEN T.teamid = Map.winnerid THEN 1-mp.probct else mp.probct END END as probabilitymap from rounds R inner join maps Map on Map.mapid = R.mapid inner join map_prob mp on mp.mapid = Map.mapid and mp.round = r.round inner join matches Mat on Mat.matchid = Map.matchid inner join teams T on T.name = Mat.winner where Mat.matchid = $1 order by Map.mapnumber, r.round, mp.tick ASC;",
            values: [matchID],
        } 
        const res = await pool.query(Query);
        return res.rows;
    }

    
    async function getMapData(matchID){
        const Query = {
            text: "SELECT TO_CHAR(Mat.date, 'YYYY-MM-DD') as date, Mat.winner, Mat.loser, Mat.tournamentname, T.name, M.mapname, M.winnerrounds, M.loserrounds from matches Mat inner join maps M on M.matchid = Mat.matchid inner join teams T on T.teamid = M.winnerid where Mat.matchid = $1 order by M.mapnumber",
            values: [matchID],
        } 
        const res = await pool.query(Query);
        mapData = []
        for(var i=0; i < res.rows.length; i++){
            res.rows[i].winner = res.rows[i].winner.replaceAll("-", " ")
            res.rows[i].loser = res.rows[i].loser.replaceAll("-", " ")
            res.rows[i].tournamentname = res.rows[i].tournamentname.replaceAll("-", " ")
            res.rows[i].name = res.rows[i].name.replaceAll("-", " ")
            mapData[i] = res.rows[i];
        }
        
        return mapData

    }

    async function getRoundChartData(id, map, round){
        const Query = {
            text: "SELECT Mat.winner, KP.prob as xKill, A.name as attacker, V.name as victim, K.teammembersalive, K.opponentsalive, CASE WHEN RS.ct=T.teamid THEN rp.probchangect ELSE -1*rp.probchangect END as probchange, RS.damage, RS.tick, CASE WHEN RS.ct=T.teamid THEN rp.probct ELSE 1-rp.probct END as probabilitytick from roundstates RS inner join maps M on RS.mapid = M.mapid inner join rs_prob rp on rp.mapid = rs.mapid and rp.round = rs.round and rp.tick = rs.tick inner join matches Mat on Mat.matchid = M.matchid inner join teams T on T.name = Mat.winner inner join players A on RS.attacker = A.playerid inner join players V on RS.victim = V.playerid left join kills K on K.mapid = M.mapid and K.round = RS.round and K.tick = RS.tick left join kill_prob kp on KP.mapid = M.mapid and KP.round = RS.round and KP.tick = RS.tick where M.mapid = $1 and RS.round = $2 order by RS.tick ASC",
            values: [id+'-'+map, round],
        } 
        const res = await pool.query(Query);
        return res.rows;
    }

    async function getMapSummaryData(id, map){
        const Query = {
            text: "SELECT T.name as teamname, Atck.name, (Atck.xKill+Vict.xKill) as xKills, ((Atck.WPA-Vict.WPA)/Map.rounds*100) as rWPA, ((Atck.xWPA-Vict.xWPA)/Map.rounds*100) as eXrWPA from (SELECT P.name, P.playerid, rs.mapid, sum(abs(RP.probchangect)) as WPA, sum(KP.prob) as xKill, sum(KP.prob*abs(RP.probchangect)) as xWPA from roundstates RS inner join rs_prob RP on RP.mapid = RS.mapid and RP.round = RS.round and RP.tick = RS.tick inner join players P on P.playerid = RS.attacker inner join kills K on K.mapid = RS.mapid and K.round = RS.round and K.tick = RS.tick inner join kill_prob KP on K.mapid = KP.mapid and K.round = KP.round and K.tick = KP.tick where RS.attacker != -1 and RS.victim != -1 group by P.name, P.playerid, rs.mapid) as Atck inner join (SELECT P.name, P.playerid, rs.mapid, sum(abs(RP.probchangect)) as WPA, sum(1-KP.prob) as xKill, sum(KP.prob*abs(RP.probchangect)) as xWPA from roundstates RS inner join rs_prob RP on RP.mapid = RS.mapid and RP.round = RS.round and RP.tick = RS.tick inner join players P on P.playerid = RS.victim inner join kills K on K.mapid = RS.mapid and K.round = RS.round and K.tick = RS.tick inner join kill_prob KP on K.mapid = KP.mapid and K.round = KP.round and K.tick = KP.tick where RS.attacker != -1 and RS.victim != -1 group by P.name, P.playerid, rs.mapid) as Vict on Vict.mapid = Atck.mapid and Vict.name = Atck.name inner join (SELECT winnerrounds+loserrounds as Rounds, mapid from maps) as Map on Vict.mapid = Map.mapid inner join player_maps PM on PM.mapid = Map.mapid inner join teams T on T.teamid = PM.teamid where Atck.mapid = $1 and  PM.playerid = Atck.playerid order by eXrWPA DESC",
            values: [id+'-'+map],
        } 
        const res = await pool.query(Query);
        return res.rows;
    }

    async function getPlayerSummaryData(){
        const Query = {
            text: "SELECT T.name as teamname, stats.playername as name, count(distinct stats.mapid) as maps, sum(stats.xKill)/count(distinct stats.mapid) as xKills, sum(stats.WPA)/count(distinct concat(stats.round, stats.mapid))*100 as rWPA, sum(stats.xWPA)/count(distinct concat(stats.round, stats.mapid))*100 as eXrWPA from ((SELECT P.name as playername, P.playerid as id, abs(RP.probchangect) as WPA, KP.prob as xKill, KP.prob*abs(RP.probchangect) as xWPA, K.round, K.mapid as mapid from players P inner join roundstates RS on P.playerid = RS.attacker inner join rs_prob rp on rp.mapid = rs.mapid and rp.round = rs.round and rp.tick = rs.tick inner join kills K on K.mapid = RS.mapid and K.round = RS.round and K.tick = RS.tick inner join kill_prob KP on K.mapid = KP.mapid and K.round = KP.round and K.tick = KP.tick inner join maps Ma on Ma.mapid = RS.mapid inner join matches Mat on Mat.matchid = Ma.matchid where Mat.date > CURRENT_DATE - 31 )union all (SELECT P.name as playername, P.playerid as id, (-1*abs(RP.probchangect)) as WPA, 1-KP.prob as xKill, (KP.prob)*(abs(RP.probchangect))*-1 as xWPA, K.round, K.mapid as mapid from players P inner join roundstates RS on P.playerid = RS.victim inner join rs_prob rp on rp.mapid = rs.mapid and rp.round = rs.round and rp.tick = rs.tick inner join kills K on K.mapid = RS.mapid and K.round = RS.round and K.tick = RS.tick inner join kill_prob KP on K.mapid = KP.mapid and K.round = KP.round and K.tick = KP.tick inner join maps Ma on Ma.mapid = RS.mapid inner join matches Mat on Mat.matchid = Ma.matchid where Mat.date > CURRENT_DATE - 31 )) stats inner join player_maps PM on PM.mapid = stats.mapid and PM.playerid = stats.id inner join teams T on T.teamid = PM.teamid where stats.playername != 'World' group by T.name, stats.playername  having count(distinct stats.mapid) > 2 order by eXrWPA DESC"
        } 
        const res = await pool.query(Query);
        return res.rows;
    }
}