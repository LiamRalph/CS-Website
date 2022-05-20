async function renderRoundPick(){
  document.getElementById("MapSelect").addEventListener("click", updateDrop);
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
          minGridDistance: 30
        })
      })
    );

    yAxis.children.unshift(
      am5.Label.new(root, {
        rotation: -90,
        text: winner.charAt(0).toUpperCase() + winner.slice(1) +" Win%",
        y: am5.p50,
        centerX: am5.p50,
        fontSize: 20,
      })
    );

    var xAxis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        valueField: "tick",
        min: 0,
        renderer: am5xy.AxisRendererX.new(root, {

        }),
      })
    );

    xAxis.children.push(
      am5.Label.new(root, {
        text: "Tick",
        x: am5.percent(52),
        centerX:am5.percent(50),
        fontSize: 20,
      })
    );
    


    let colours = [ 0x0000FF, 0xff0000, 0x00FF00, 0x000000, 0xC90076, 0xBC4400, 0xBCA200]


    data = data.map(t => ({probabilitytick: (t.probabilitytick*100).toFixed(2), tick: t.tick, attacker: t.attacker.charAt(0).toUpperCase()+t.attacker.slice(1), victim: t.victim.charAt(0).toUpperCase()+t.victim.slice(1), damage: t.damage, probabilitychange: Math.abs((t.probabilitychange*100).toFixed(2)), winner: t.winner.charAt(0).toUpperCase()+t.winner.slice(1), expectedkill: t.expectedkill, teammembersalive: t.teammembersalive, opponentsalive: t.opponentsalive}));

    console.log(data)
    for(let i = 0; i < data.length; i++){
      if(data[i].expectedkill > 0){
        data[i].showBullets = true
        if(data[i].probabilitychange == 100){
          data[i].probabilitychange = "Win";
        }
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
            tooltipText: "[bold] {attacker} kills {victim} - {teammembersalive} vs {opponentsalive} - xKill {expectedkill} \n tick {tick} - {probabilitytick}% ± {probabilitychange}  ",
            tooltip: am5.Tooltip.new(root, {
              scale: 1,
              
            })
            
          })
        });
      }
    });
    

    series.set("stroke", am5.color(colours[mapNo-1]));
    series.set("fill", am5.color(colours[mapNo-1]));
  }
}