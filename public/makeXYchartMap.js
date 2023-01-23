

async function renderMap(){
  let matchID = JSON.parse(document.getElementsByClassName('main')[0].getAttribute('ids'));

  let matchElement = document.getElementById(matchID);
  let winner = matchElement.getAttribute('winner');
  let res = await fetch("/data/match/"+matchID);
  dataJSON = await res.json();
  if(dataJSON.length > 0){
    await renderGraph(matchID, winner, dataJSON);
  }
      
  

  async function renderGraph(matchID, winner, data){
    let renderCount = 0;
  
    let mapCount = Math.max.apply(this, [...new Set(data.map(rounds => rounds.mapnumber))]);
    let roundMax = Math.max.apply(this, [...new Set(data.map(rounds => rounds.round))]);
    
  


    var root = am5.Root.new(matchID);
    var chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        width: am5.percent(95),
        //height: am5.percent(50)
      })
    );
    chart.set("cursor", am5xy.XYCursor.new(root, {}));




    var yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        valueField: "probabilitymap",
        min: 0,
        max: 100,
        renderer: am5xy.AxisRendererY.new(root, {
          minGridDistance: 30
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
        fontSize: 20,
      })
    );


    
    var xAxis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        valueField: "round",
        min: 1,
        max: roundMax,
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: roundMax
        }),
      })
    );
    xAxis.get("renderer").labels.template.setAll({
      fontSize: 20,
    });
    xAxis.children.push(
      am5.Label.new(root, {
        text: "Round",
        x: am5.percent(52),
        centerX:am5.percent(50),
        fontSize: 20,
      })
    );
    


    let colours = [ 0x0000FF, 0xff0000, 0xC90076, 0xBC4400, 0x000000, 0x00FF00, 0xBCA200]


    for(var i=0; i < mapCount; i++){
      let mapNo = i+1
      let mapData = data.filter(t => t.mapnumber == mapNo);
      
      if(mapData.length == 0){
        continue
      }
      let mapName = mapData[0].mapname
      mapData = mapData.map(t => ({probabilitymap: (t.probabilitymap*100).toFixed(2), round: t.round, tick: t.tick, roundprog: t.roundprog, score: t.winnerscore + "-" + t.loserscore}));
      for(let i = 0; i < mapData.length; i++){
        if(mapData[i].tick == 0){
          mapData[i].showBullets = true
        }
        else{
          mapData[i].showBullets = false
        }
      }
      let hidden = true
      if(mapNo > 1){
        hidden = false
      }
      var series = chart.series.push(
        am5xy.SmoothedXYLineSeries.new(root, {
          name: mapName,
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: "probabilitymap",
          valueXField: "roundprog",
          visible: hidden,
        })
      );
      
      series.data.setAll(mapData);
      series.set("stroke", am5.color(colours[i]));
      series.set("fill", am5.color(colours[i]));
      
      
      series.bullets.push(function(root, series, dataItem) {
        if (dataItem.dataContext.showBullets == true) {
          return am5.Bullet.new(root, {
            sprite: am5.Circle.new(root, {
              radius: 5,
              fill: am5.color(0x000000),
              
              tooltipText: "[bold]{name} - Round {round} \n {score} - {probabilitymap}%",
              tooltip: am5.Tooltip.new(root, {
                scale: 0.4,
              })
              
            })
          });
        }
      });
      
      renderCount += 1;
    }


    var legendRoot = am5.Root.new("LegendContainer"+matchID);
    var legend = legendRoot.container.children.push(am5.Legend.new(legendRoot, {
      useDefaultMarker: true,
      x: am5.percent(53),
      centerX: am5.percent(50),
    })); 

    legend.markerRectangles.template.setAll({
      cornerRadiusTL: 10,
      cornerRadiusTR: 10,
      cornerRadiusBL: 10,
      cornerRadiusBR: 10
    });

    legend.data.setAll(chart.series.values);

    legend.labels.template.setAll({
      fontSize: 25,
    });
    
    if(renderCount == mapCount){
      document.getElementById(matchID+"ChartText").innerText = '';
    }
    
 

  }
}