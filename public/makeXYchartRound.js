async function renderRoundPick(){

  
  document.getElementById("MapSelect").addEventListener("click", updateDrop);
  document.getElementById("MapSelect").addEventListener("click", summaryTable);
  updateDrop();
  summaryTable();

  
  function updateDrop(){
    let dropdown = document.getElementById("RoundSelect");
    document.getElementById("RoundSelect").innerHTML = "";
    let roundArray = [];
    if (roundArray.length != 0 ){
      return
    } 
    let mapList = document.getElementsByClassName("mapScore")
    let mapSelected = mapList[document.getElementById("MapSelect").selectedIndex-1]
    for(var i=0; i < mapSelected.getAttribute("rounds"); i++){
      roundArray.push(i+1);
    }
    option = document.createElement("option");
    option.text = "Round";
    dropdown.appendChild(option)
    roundArray.forEach(item => {
      option = document.createElement("option");
      option.text = item;
      dropdown.appendChild(option)
    });
  }

  async function summaryTable(){
    let matchID = JSON.parse(document.getElementsByClassName('main')[0].getAttribute('ids'));
    let mapNo = document.getElementById("MapSelect").selectedIndex;
    let res = await fetch("/data/match/"+matchID+"/"+mapNo);
    dataJSON = await res.json();

    let tableHead = document.getElementById("MapTableHead");
    tableHead.innerHTML="";
    tableHead.innerHTML="<tr><th> Team </th><th> Name </th><th> xKills </th><th> RI </th><th> xRI </th> <th> RI above xRI </th> </tr>";

    let table = document.getElementById("MapTableBody");
    table.innerHTML="";
    let tr="";
    dataJSON.forEach(x=>{
      tr+='<tr>';
      tr+='<td>'+x.teamname.replaceAll('-', ' ')+'</td>'+'<td>'+x.name+'</td>'+'<td>'+x.xkills.toFixed(2)+'</td>' +'<td>'+x.rwpa.toFixed(2)+'% </td>' +'<td>'+x.exrwpa.toFixed(2)+'% </td>' +'<td>'+(x.rwpa-x.exrwpa).toFixed(2)+' </td>'
      tr+='</tr>'
    })
    table.innerHTML+=tr;
    $("#MapTable").tablesorter({
      theme: 'default',
      sortList: [[3, 1]],
      headerTemplate: '{content}{icon}',
      widgets: ['zebra', 'uitheme']
    });
    $('#MapTable').trigger('updateAll');
    
    return true;
  }

  

}

async function renderRound(){
  let matchID = JSON.parse(document.getElementsByClassName('main')[0].getAttribute('ids'));
  let matchElement = document.getElementById(matchID);
  let winner = matchElement.getAttribute('winner');
  let mapNo = document.getElementById("MapSelect").selectedIndex;
  let roundNo = document.getElementById("RoundSelect").value;
  let res = await fetch("/data/match/"+matchID+"/"+mapNo+"/"+roundNo);

  dataJSON = await res.json();
  if(dataJSON.length > 0){
    await renderGraph(matchID, winner, dataJSON);
  }
      
  

  async function renderGraph(matchID, winner, data){

    am5.array.each(am5.registry.rootElements, function (root) {
        if (root.dom.id == matchID+"Round") {
          root.dispose();
        }
    });

    var root = am5.Root.new(matchID+"Round");
    var chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        width: am5.percent(95),
        //height: am5.percent(50)
      })
    );
    chart.set("cursor", am5xy.XYCursor.new(root, {}));
    var yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        valueField: "probabilitytick",
        min: 0,
        max: 100,
        renderer: am5xy.AxisRendererY.new(root, {
          minGridDistance: 40
        })
      })
    );
    yAxis.get("renderer").labels.template.setAll({
      fontSize: 30,
    });
    yAxis.children.unshift(
      am5.Label.new(root, {
        rotation: -90,
        text: winner.charAt(0).toUpperCase() + winner.slice(1) +" Win%",
        y: am5.p50,
        centerX: am5.p50,
        fontSize: 40,
      })
    );
    
    var xAxis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        valueField: "tick",
        min: 0,
        numberFormat: "#",
        renderer: am5xy.AxisRendererX.new(root, {
        
        }),
      })
    );
    xAxis.get("renderer").labels.template.setAll({
      fontSize: 20,
    });
    xAxis.children.push(
      am5.Label.new(root, {
        text: "Tick",
        x: am5.percent(50),
        centerX:am5.percent(50),
        fontSize: 40,
        
      })
    );



    let colours = [ 0x0000FF, 0xff0000, 0xC90076, 0xBC4400, 0x000000, 0x00FF00, 0xBCA200]

    function fmtMSS(s){return(s-(s%=60))/60+(9<s?':':':0')+s}
    data = data.map(t => ({probabilitytick: (t.probabilitytick).toFixed(4)*100, time: fmtMSS((t.tick/128).toFixed(0)), tick: t.tick, attacker: t.attacker.charAt(0).toUpperCase()+t.attacker.slice(1), victim: t.victim.charAt(0).toUpperCase()+t.victim.slice(1), damage: t.damage, probabilitychange: Math.abs((t.probchange).toFixed(4)*100), XrWPA: Math.abs((t.probchange*t.xkill).toFixed(4)*100), winner: t.winner.charAt(0).toUpperCase()+t.winner.slice(1), expectedkill: Math.abs(t.xkill).toFixed(4)*100, teammembersalive: t.teammembersalive, opponentsalive: t.opponentsalive}));

    

    for(let i = 0; i < data.length; i++){
      if(data[i].expectedkill > 0 && data[i].attacker != "World" && data[i].victim != "World"){
        data[i].showBullets = true
      }
      else{
        data[i].showBullets = false
      }
    }

    var series = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: "Round" + roundNo,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "probabilitytick",
        valueXField: "tick",
        
      })
    );
    series.data.setAll(data);
    series.bullets.push(function(root, series, dataItem) {
      if (dataItem.dataContext.showBullets == true) {
        return am5.Bullet.new(root, {
          sprite: am5.Circle.new(root, {
            radius: 5,
            fill: am5.color(0x000000),
            
            tooltipText: "Tick {tick} - {time} - {teammembersalive} vs {opponentsalive} \n{attacker} kills {victim} - xKill {expectedkill}% \nRI {probabilitytick}% ± {probabilitychange}% - xRI {XrWPA}% ",
            tooltip: am5.Tooltip.new(root, {
              scale: 0.4,
            })
            
          })
        });
      }
    });
    

    series.set("stroke", am5.color(colours[mapNo-1]));
    series.set("fill", am5.color(colours[mapNo-1]));
  }
  document.getElementById(matchID+"ContainerMap").style.display = "inline";
  return true;
}