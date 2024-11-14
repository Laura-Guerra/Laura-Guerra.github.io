// Configuración básica
var width = 500,
    height = 500,
    start = 0,
    end = 3,  
    numSpirals = 4,
    margin = {top: 20, bottom: 20, left: 20, right: 20};

var theta = function(r) {
  return numSpirals * Math.PI * r;
};

// Crear un mapa de colores para cada año
var yearColors = d3.scaleOrdinal()
  .domain(d3.range(2001, 2024))  // Años desde 2001 hasta 2014
  .range(d3.schemeCategory10);    // Usamos 10 colores (se repetirán si hay más de 10 años)

var r = d3.min([width, height]) / 2 - 40;

var radius = d3.scaleLinear()
  .domain([start, end])
  .range([40, r+30]);

// Creación del contenedor SVG
var svg = d3.select("#chart").append("svg")
  .attr("width", width + margin.right + margin.left)
  .attr("height", height + margin.left + margin.right)
  .append("g")
  .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var points = d3.range(start, end + 0.001, (end - start) / 1000);
var spiral = d3.radialLine()
  .curve(d3.curveCardinal)
  .angle(theta)
  .radius(radius);

var path = svg.append("path")
  .datum(points)
  .attr("id", "spiral")
  .attr("d", spiral)
  .style("fill", "none")
  .style("stroke", "steelblue");

// Calculamos la longitud total de la espiral y el ancho de las barras para cada mes
var spiralLength = path.node().getTotalLength(),
barWidth = (spiralLength / 168) * 0.5;  // 168 = 12 meses * 14 años

// Cargar los datos desde el CSV
d3.csv("unemployees.csv", function(data) {

  data = data.filter(function(d) {
    return d.YEARMONTH.trim() !== "";  // Filtra elementos donde YEARMONTH no es una cadena vacía
  })

  // Limpieza y preparación de datos
  data.forEach(function(d) {
    d.YearMonth = d.YEARMONTH;  // Formato yyyymm
    d.Year = +d.YearMonth.substring(0, 4); // Extraer solo el año como número
    d.MonthName = d.MONTH.toLowerCase();  // Convertimos a minúsculas para consistencia
    d.Unemployment = +d.TOTAL;  // Número de desempleados en millones
  });

  // Escala lineal para la posición de cada mes en la espiral
  var timeScale = d3.scaleLinear()
    .domain([0, data.length - 1])  // Índices de los meses (0 a 167 para 14 años)
    .range([0, spiralLength]);

  // Escala para la altura de las barras
  var yScale = d3.scaleLinear()
    .domain([0, d3.max(data, function(d) { return d.Unemployment; })])
    .range([0, (r / numSpirals) - 30]);

  // Crear rectángulos para cada mes
  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", function(d, i) {
      var linePer = timeScale(i),
          posOnLine = path.node().getPointAtLength(linePer),
          angleOnLine = path.node().getPointAtLength(linePer - barWidth);
      d.x = posOnLine.x;
      d.y = posOnLine.y;
      d.a = (Math.atan2(angleOnLine.y, angleOnLine.x) * 180 / Math.PI) - 90;
      return d.x;
    })
    .attr("y", function(d) { return d.y; })
    .attr("width", barWidth)
    .attr("height", function(d) { return yScale(d.Unemployment); })
    .style("fill", function(d) { return yearColors(d.Year); })  // Color asignado por año
    .attr("transform", function(d) { return "rotate(" + d.a + "," + d.x  + "," + d.y + ")"; });

// Agregar etiquetas de fecha (solo para enero de cada año)
svg.selectAll("text")
  .data(data.filter(function(d) { return d.MonthName === "enero"; }))  // Solo datos de enero
  .enter()
  .append("text")
  .attr("dy", 10)
  .style("text-anchor", "start")
  .style("font", "10px arial")
  .append("textPath")
  .text(function(d) {
    // Mostrar solo el año
    return d.YearMonth.substring(0, 4);
  })
  .attr("xlink:href", "#spiral")
  .style("fill", "grey")
  .attr("startOffset", function(d) {
    // Calcular la posición en la espiral para cada barra correspondiente a enero
    var index = data.indexOf(d);  // Encuentra el índice de este dato
    var linePer = timeScale(index);  // Usa este índice en la escala de tiempo
    
    // Ajuste especial para la primera etiqueta (2001) para que no se corte
    if (d.YearMonth.substring(0, 4) === "2001") {
      return "0%";  // Posición inicial ajustada para que la primera etiqueta quede visible
    }
    
    // Ajuste para las demás etiquetas de enero
    var offset = linePer - (barWidth * 0.75);  // Mueve ligeramente a la izquierda
    return ((offset / spiralLength) * 100) + "%";
  });

  // Agregar tooltip
  var tooltip = d3.select("#chart").append("div").attr("class", "tooltip");
  tooltip.append("div").attr("class", "date");
  tooltip.append("div").attr("class", "value");

  svg.selectAll("rect")
    .on("mouseover", function(d) {
      tooltip.select(".date").html("Mes: <b>" + d.MonthName + " " + d.Year + "</b>");
      tooltip.select(".value").html("Desempleo: <b>" + d.Unemployment + "</b>");

      d3.select(this)
        .style("fill", "#FFFFFF")
        .style("stroke", "#000000")
        .style("stroke-width", "2px");

      tooltip.style("display", "block");
      tooltip.style("opacity", 2);
    })
    .on("mousemove", function(d) {
      tooltip.style("top", (d3.event.layerY + 10) + "px")
        .style("left", (d3.event.layerX - 25) + "px");
    })
    .on("mouseout", function(d) {
      d3.selectAll("rect")
        .style("fill", function(d) { return yearColors(d.Year); })  // Restaura el color por año
        .style("stroke", "none");

      tooltip.style("display", "none");
      tooltip.style("opacity", 0);
    });
});
