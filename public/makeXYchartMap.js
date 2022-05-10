

let matches = JSON.parse(document.currentScript.getAttribute('ids'));

for(var i=0; i < matches.length; i++){
    
  let matchID = matches[i].matchid;
  let matchElement = document.getElementsByClassName("Chart")[i];
  let data = JSON.parse(matchElement.getAttribute('data'))
  
  if(data.length > 0){
    renderGraph(matchID, data)
  }

    
}

for(var i=0; i < matches.length; i++){
  let matchID = matches[i].matchid;
  document.getElementById(matchID).setAttribute("data", "[]")
}

function renderGraph(matchID, data){
  let renderCount = 0;
  var json = { ticks: data}
  let mapCount = Math.max.apply(this, [...new Set(json.ticks.map(ticks => ticks.mapnumber))]);
  
  
 


  var root = am5.Root.new(matchID);
  var chart = root.container.children.push(
    am5xy.XYChart.new(root, {
      //width: am5.percent(75),
      //height: am5.percent(50)
    })
  );
  var yAxis = chart.yAxes.push(
    am5xy.ValueAxis.new(root, {
      valueField: "ctprobabilitymap",
      min: 0,
      max: 1.0,
      renderer: am5xy.AxisRendererY.new(root, {})
    })
  );
  var xAxis = chart.xAxes.push(
    am5xy.ValueAxis.new(root, {
      valueField: "gametick",
      min: 0,
      max: 1.0,
      renderer: am5xy.AxisRendererX.new(root, {}),
    })
  );
  let yRenderer = yAxis.get("renderer");
  yRenderer.labels.template.setAll({

  });
  let xRenderer = xAxis.get("renderer");
  xRenderer.labels.template.setAll({
    visible: false
  });
  
 

  let colours = [ 0xff0000, 0x0000FF, 0x000000, 0x07BC8E, 0xBC078E, 0x00FF00, 0xBC8E07]


  for(var i=0; i < mapCount; i++){
    let mapNo = i+1
    let mapData = json.ticks.filter(t => t.mapnumber == mapNo);
    
    if(mapData.length == 0){
      continue
    }
    let lastTick = mapData.at(-1).gametick
    mapData = mapData.map(t => ({gametick: t.gametick/lastTick, ctprobabilitymap: t.ctprobabilitymap}));

    var series = chart.series.push(
      am5xy.SmoothedXYLineSeries.new(root, {
        name: "CTWinProb Map " + mapNo,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "ctprobabilitymap",
        valueXField: "gametick"
      })
    );
    series.data.setAll(mapData);
    series.set("stroke", am5.color(colours[i]));
    series.set("fill", am5.color(colours[i]));
    
  }


  var legendRoot = am5.Root.new("LegendContainer"+matchID);
  var legend = legendRoot.container.children.push(am5.Legend.new(legendRoot, {
    useDefaultMarker: true
  })); 

  legend.markerRectangles.template.setAll({
    cornerRadiusTL: 10,
    cornerRadiusTR: 10,
    cornerRadiusBL: 10,
    cornerRadiusBR: 10
  });

  legend.data.setAll(chart.series.values);

  

  
  renderCount += 1;
  if(renderCount == mapCount){
    document.getElementById(matchID+"ChartText").innerText = '';
  }

}