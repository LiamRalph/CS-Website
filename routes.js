
module.exports = function(app){
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


    //Get homepage
    app.get("/", async (req, res, next)=> { 
        let lastDate = await getLastDate();
        let lastMatchDayIDs = await getMatchDayIDs(lastDate);
        let lastMatchChartData = await getMatchDayChartData(lastMatchDayIDs);
        let matchData = await getMatchData(lastMatchDayIDs);
        let beforeAndAfterDates = await getDateBeforeAfter(lastDate);
        res.render("pages/index", {date: lastDate, beforeAndAfter: beforeAndAfterDates, matches: matchData, matchIDs: lastMatchDayIDs, matchData: lastMatchChartData}); 

    });

    //Get matches on specific date
    app.get("/date/:date", async (req, res, next)=> { 
        let day = req.params.date;
        let matchDayIDs = await getMatchDayIDs(day);
        let matchChartData = await getMatchDayChartData(matchDayIDs);
        let matchData = await getMatchData(matchDayIDs);
        let beforeAndAfterDates = await getDateBeforeAfter(day);
        if(matchDayIDs.length > 0){
            res.render("pages/index", {date: day, beforeAndAfter: beforeAndAfterDates, matches: matchData, matchIDs: matchDayIDs, matchData: matchChartData});
        }
        else{
            //res.render("pages/NoMatches");
        }
        
        

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

    async function getMatchDayIDs(lastDate){
        const matchesQuery = {
            text: "SELECT matchid from matches where date = $1 order by time DESC;",
            values: [lastDate],
        } 
        const res = await pool.query(matchesQuery)
        return res.rows

    }

    async function getMatchDayChartData(matchIDs){
        
        let matches = {}

        for(var i=0; i < matchIDs.length; i++){
            let matchID = matchIDs[i];
            const Query = {
                text: "SELECT Map.mapnumber, rs.round, rs.tick, CASE WHEN Map.winnerstart='ct' THEN CASE WHEN RS.ct=Map.winnerid THEN RS.ctprobabilitymap ELSE RS.tprobabilitymap END WHEN Map.winnerstart='t' THEN CASE WHEN RS.t=Map.winnerid THEN RS.tprobabilitymap ELSE RS.ctprobabilitymap END END as probabilitymap,ROW_NUMBER() OVER(PARTITION BY mapnumber ORDER BY mapnumber,round, tick)::int as gameTick from roundstates RS inner join maps Map on Map.mapid = RS.mapid inner join matches Mat on Mat.matchid = Map.matchid where Mat.matchid = $1 order by Map.mapnumber ASC;",
                values: [matchID.matchid],
            } 
            const res = await pool.query(Query);

            if (res.rows.length > 0 && res.rows[0].round == 1){
                matches[matchID.matchid] = res.rows;
            }
            else{
                matches[matchID.matchid] = [];
            }
            
        }
        return matches

    }

    async function getMatchData(matchIDs){
        
        let matches = {}

        for(var i=0; i < matchIDs.length; i++){
            let matchID = matchIDs[i];
            const Query = {
                text: "SELECT Mat.winner, Mat.loser, Mat.tournamentname from matches Mat where Mat.matchid = $1 limit 1;",
                values: [matchID.matchid],
            } 
            const res = await pool.query(Query);

            matches[matchID.matchid] = res.rows[0];
        }
        return matches

    }
}