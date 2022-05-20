
module.exports = function(app){
    const cors = require("cors");
    require('dotenv').config()
    const { Pool } = require('pg');
    const pool = new Pool({
        host: process.env.DB_IP,
        user: 'postgres',
        password: process.env.DB_PASS,
        port: 5432,
        database: 'CSGO',
    });
    pool.connect()
    const corsOptions = {
        origin: ['http://localhost:3000', 'http://cs-reference']
      }
      
    app.use(cors(corsOptions)) 

    //Get homepage
    app.get("/", async (req, res, next)=> { 
        let lastDate = await getLastDate();
        let lastMatchDayIDs = await getMatchIDs(lastDate);
        let matchData = await getMatchData(lastMatchDayIDs);
        let beforeAndAfterDates = await getDateBeforeAfter(lastDate);
        res.render("pages/index", {date: new Date(lastDate).toLocaleDateString("en-US", {year: 'numeric', month: 'long', day: 'numeric'}), beforeAndAfter: beforeAndAfterDates, matches: matchData, matchIDs: lastMatchDayIDs}); 
    });
      
    //Get matches on specific date
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


    app.get("/data/match/:id", cors(), async (req, res) => {
        matchID = parseInt(req.params.id)+2356097
        let ChartData = await getMatchChartData(matchID);
        res.json(ChartData)
    })


    app.get("/data/match/:id/:map/:round", cors(), async (req, res) => {
        let id = parseInt(req.params.id);
        let map = parseInt(req.params.map);
        let round = parseInt(req.params.round);
        let ChartData = await getRoundChartData(id+2356097, map, round);
        res.json(ChartData)
    })


    app.get("/about", async (req, res, next)=> { 
        res.render("pages/about");
    });


    async function getLastDate(){
        const latestDateQuery = {
            text: "SELECT TO_CHAR(date, 'YYYY-MM-DD') as date from matches Match where exists(select 1 from roundstates RS inner join maps Map on Map.matchid = Match.matchid where RS.mapid = Map.mapid) order by date DESC limit 1;"
        }
        const res = await pool.query(latestDateQuery)
        return res.rows[0].date
    }

    async function getDateBeforeAfter(date){
        ret = {}
        const beforeQuery = {
            text: "SELECT TO_CHAR(date, 'YYYY-MM-DD') as date from matches Match where exists(select 1 from roundstates RS inner join maps Map on Map.matchid = Match.matchid where RS.mapid = Map.mapid) and match.date < $1 order by date DESC limit 1;",       
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
            matches[matchID.matchid] = res.rows[0];
        }
        return matches

    }

    async function getMatchChartData(matchID){
        const Query = {
            text: "((SELECT Map.mapnumber, Map.mapname, 0 as ctstartscore, 0 as tstartscore, 1 as round, CASE WHEN Map.winnerstart='ct' THEN CASE WHEN Map.winnerid = T.teamid THEN R.ctprobabilitymap ELSE R.tprobabilitymap END ELSE CASE WHEN Map.winnerid = T.teamid THEN R.tprobabilitymap ELSE R.ctprobabilitymap END END as probabilitymap from rounds R inner join maps Map on Map.mapid = R.mapid inner join rounds R2 on R2.mapid = R.mapid and R2.round = R.round-1 inner join matches Mat on Mat.matchid = Map.matchid inner join teams T on T.name = Mat.winner where Mat.matchid = $1 and R2.round = 1 order by Map.mapnumber ASC) UNION ALL (SELECT Map.mapnumber, Map.mapname, CASE WHEN Map.winnerstart='ct' THEN CASE WHEN R2.winner = T.teamid THEN R2.winnerscore ELSE R2.loserscore END ELSE CASE WHEN R2.winner = T.teamid THEN R2.loserscore ELSE R2.winnerscore END END as ctstartscore, CASE WHEN Map.winnerstart='t' THEN CASE WHEN R2.winner = T.teamid THEN R2.winnerscore ELSE R2.loserscore END ELSE CASE WHEN R2.winner = T.teamid THEN R2.loserscore ELSE R2.winnerscore END END as tstartscore, r.round, CASE WHEN Map.winnerstart='ct' THEN CASE WHEN Map.winnerid = T.teamid THEN R2.ctprobabilitymap ELSE R2.tprobabilitymap END ELSE CASE WHEN Map.winnerid = T.teamid THEN R2.tprobabilitymap ELSE R2.ctprobabilitymap END END as probabilitymap from rounds R inner join maps Map on Map.mapid = R.mapid inner join rounds R2 on R2.mapid = R.mapid and R2.round = R.round-1 inner join matches Mat on Mat.matchid = Map.matchid inner join teams T on T.name = Mat.winner where Mat.matchid = $2 order by Map.mapnumber ASC));",
            values: [matchID, matchID],
        } 
        const res = await pool.query(Query);
        return res.rows;
    }

    
    async function getMapData(matchID){
        const Query = {
            text: "SELECT TO_CHAR(Mat.date, 'YYYY-MM-DD') as date, Mat.winner, Mat.loser, Mat.tournamentname, T.name, M.mapname, M.winnerrounds, M.loserrounds from matches Mat inner join maps M on M.matchid = Mat.matchid inner join teams T on T.teamid = M.winnerid where Mat.matchid = $1",
            values: [matchID],
        } 
        const res = await pool.query(Query);
        mapData = []
        for(var i=0; i < res.rows.length; i++){
            mapData[i] = res.rows[i];
        }
        
        return mapData

    }

    async function getRoundChartData(id, map, round){
        const Query = {
            text: "SELECT Mat.winner, K.expectedkill, A.name as attacker, V.name as victim, K.teammembersalive, K.opponentsalive, RS.probabilitychange, RS.damage, RS.tick, CASE WHEN RS.ct=T.teamid THEN RS.ctprobability ELSE RS.tprobability END as probabilitytick from roundstates RS inner join maps M on RS.mapid = M.mapid inner join matches Mat on Mat.matchid = M.matchid inner join teams T on T.name = Mat.winner inner join players A on RS.attacker = A.playerid inner join players V on RS.victim = V.playerid left join kills K on K.mapid = M.mapid and K.round = RS.round and K.tick = RS.tick where M.mapid = $1 and RS.round = $2 order by RS.tick ASC",
            values: [id+'-'+map, round],
        } 
        const res = await pool.query(Query);
        return res.rows;
    }
}