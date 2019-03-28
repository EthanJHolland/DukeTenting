(function () {
  d3.timeline = function() {
    var DISPLAY_TYPES = ["circle", "rect"];

    var hover = function () {},
      mouseover = function(){return tooltip.style("visibility", "visible");},
      mousemove = function(d){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").text(d.message);},
      mouseout = function(){return tooltip.style("visibility", "hidden");},
      click = function () {},
      scroll = function () {},
      labelFunction = function(label) { return label; },
      navigateLeft = function () {},
      navigateRight = function () {},
      width = null,
      height = null,
      rowSeparatorsColor = null,
      backgroundColor = null,
      tickFormat = { format: d3.time.format("%I %p"),
        tickTime: d3.time.hours,
        tickInterval: 1,
        tickSize: 6,
        tickValues: null
      },
      tempTickFormat = {
        tickValues: [0,15,30,45,60],
        majorTickLength: 6,
        minorTickLength: 4
      },
      timelineColor = () => "black",//the color of the actual lines on the timeline
      annotationColor = () => "black", //the color of other lines and annotations
      backgroundColor = () => "white", //the color of the background
      colorPropertyName = null,
      display = "rect",
      beginning = -1,
      ending = -1,
      labelMargin = 0,
      margin = {left: 10, right:10, top: 10, bottom:10},
      stacked = false,
      topAndBottom = false;
      rotateTicks = false,
      fullLengthBackgrounds = false,
      itemHeight = 5,
      itemMargin = 0,
      navMargin = 60,
      showTimeAxis = false,
      showTempAxis = false,
      showAxisTop = false,
      timeAxisTick = false,
      timeAxisTickFormat = {stroke: "stroke-dasharray", spacing: "4 10"},
      showBorderLine = false,
      showBorderFormat = {width: 1, color: annotationColor},
      midnightBorderFormat = {width: 1, color: annotationColor},
      tempMin = 0,
      tempMax = 60,
      showAxisHeaderBackground = false,
      showAxisNav = false,
      showAxisCalendarYear = false,
      axisBgColor = "white",
      chartData = {}
    ;

    function timeline (gParent) {
      //setup
      var g = gParent.append("g");
      var gParentSize = gParent[0][0].getBoundingClientRect();
      var gParentItem = d3.select(gParent[0][0]);
      var yAxisMapping = {};
      var maxStack = 1;
      setWidth();
      setHeight();

      // figure out beginning and ending times if they are unspecified
      if (ending === -1 || beginning === -1) setBeginningAndEnding()

      //define various scales
      var scaleFactor = (1/(ending - beginning)) * (width - margin.left - margin.right);
      var xScale = d3.time.scale()
        .domain([beginning, ending])
        .range([margin.left, width - margin.right]);
      var yTempScale = d3.scale.linear()
        .domain([tempMin, tempMax])
        .range([getBottom(), getTop()]);

      //draw vertical line for every midnight
      appendMidnights();

      //add temperature line graph
      appendTemperatureLine();

      //draw tick for each tentcheck
      appendTentCheckTicks();
      
      //add line to form top of boxes
      appendTopBar(showBorderFormat);

      // draw the timeline itself
      appendTimeline();

      //show axes
      if (showTempAxis) { appendTempAxis(g, yTempScale); }
      var belowLastItem = (margin.top + (itemHeight + itemMargin) * maxStack);
      var aboveFirstItem = margin.top;
      var timeAxisYPosition = showAxisTop ? aboveFirstItem : belowLastItem;
      var xAxis = d3.svg.axis()
      .scale(xScale)
      .orient("bottom")
      .tickFormat(tickFormat.format)
      .tickSize(tickFormat.tickSize);
      if (tickFormat.tickValues != null) {
        xAxis.tickValues(tickFormat.tickValues);
      } else {
        xAxis.ticks(tickFormat.numTicks || tickFormat.tickTime, tickFormat.tickInterval);
      }
      if (showTimeAxis) { appendTimeAxis(g, xAxis, timeAxisYPosition); }
      if (timeAxisTick) { appendTimeAxisTick(g, xAxis, maxStack); }

      if (width > gParentSize.width) {
        var move = function() {
          var x = Math.min(0, Math.max(gParentSize.width - width, d3.event.translate[0]));
          zoom.translate([x, 0]);
          g.attr("transform", "translate(" + x + ",0)");
          scroll(x*scaleFactor, xScale);
        };

        var zoom = d3.behavior.zoom().x(xScale).on("zoom", move);

        gParent
          .attr("class", "scrollable")
          .call(zoom);
      }

      if (rotateTicks) {
        g.selectAll(".tick text")
          .attr("transform", function(d) {
            return "rotate(" + rotateTicks + ")translate("
              + (this.getBBox().width / 2 + 10) + ","
              + this.getBBox().height / 2 + ")";
          });
      }

      var gSize = g[0][0].getBoundingClientRect();

      function getXPos(d, i) {
        return margin.left + (d.starting_time - beginning) * scaleFactor;
      }

      function getXTextPos(d, i) {
        return margin.left + (d.starting_time - beginning) * scaleFactor + 5;
      }

      function setHeight() {
        if (!height && !gParentItem.attr("height")) {
          if (itemHeight) {
            // set height based off of item height
            height = gSize.height + gSize.top - gParentSize.top;
            // set bounding rectangle height
            d3.select(gParent[0][0]).attr("height", height);
          } else {
            throw "height of the timeline is not set";
          }
        } else {
          if (!height) {
            height = gParentItem.attr("height");
          } else {
            gParentItem.attr("height", height);
          }
        }
      }

      function setWidth() {
        if (!width && !gParentSize.width) {
          try {
            width = gParentItem.attr("width");
            if (!width) {
              throw "width of the timeline is not set. As of Firefox 27, timeline().with(x) needs to be explicitly set in order to render";
            }
          } catch (err) {
            console.log( err );
          }
        } else if (!(width && gParentSize.width)) {
          try {
            width = gParentItem.attr("width");
          } catch (err) {
            console.log( err );
          }
        }
        // if both are set, do nothing
      }

      function appendTopBar(lineFormat){
        gParent.append("svg:line")
          .attr("x1", fullLengthBackgrounds ? 0 : margin.left)
          .attr("y1", getTop())
          .attr("x2", fullLengthBackgrounds ? width : (width - margin.right))
          .attr("y2", getTop())
          .style("stroke", lineFormat.color)
          .style("stroke-width", lineFormat.width);
      }

      function appendTentCheckTicks(){
        if (showBorderLine){
          g.each(function (d, i) {
            d.forEach(function (datum) {
              var times = datum.times;
              times.forEach(function (time) {
                if(time.starting_time > beginning){
                  var x = xScale(time.starting_time);
                  var y = getBottom();

                  gParent.append("svg:line")
                    .attr("x1", x - showBorderFormat.width/2)
                    .attr("y1", y - itemHeight*2)
                    .attr("x2", x - showBorderFormat.width/2)
                    .attr("y2", y + itemHeight)
                    .style("stroke", showBorderFormat.color)
                    .style("stroke-width", showBorderFormat.width);
                }
              });
            });
          });
        }
      }

      function appendMidnights(){
        g.each(function (d, i) {
          d.forEach(function (datum) {
            var midnights = datum.midnights;
            midnights.forEach(function (midnight) {
              gParent.append("svg:line")
                .attr("x1", xScale(midnight))
                .attr("y1", getTop()) //default to chart top if unspecified
                .attr("x2", xScale(midnight))
                .attr("y2", getBottom() - (midnight == beginning || midnight == ending ? 0 : itemHeight)) //don't want to cover timeline except at beginning and end
                .style("stroke", midnightBorderFormat.color)
                .style("stroke-width", midnightBorderFormat.width);
            });
          });
        });
      }

      function appendTemperatureLine(){
        var valueline = d3.svg.line()
          .x((d) => xScale(d.hour))
          .y((d) => yTempScale(d.temperature));
        g.each((d,i) => {
          d.forEach((datum) => {
            g.append("path")
              .attr("class", "line")
              .attr("d", valueline(datum.hours));
          });
        });
      }

      function setBeginningAndEnding(){
        minTime = -1,
        maxTime = -1;
  
        g.each(function (d, i) {
          d.forEach(function (datum, index) {
            datum.times.forEach(function (time, i) {
              if(beginning === -1 && (time.starting_time < minTime || minTime === -1)) minTime = time.starting_time;
              if(ending === -1 && time.ending_time > maxTime) maxTime = time.ending_time;
            });
          });
        });
        if (ending === -1) ending = maxTime;
        if (beginning === -1) beginning = minTime;
      }

      function appendTimeline(){
        g.each(function(d, i) {
          chartData = d;
          d.forEach( function(datum, index){
            var data = datum.times;
            var hasLabel = (typeof(datum.label) != "undefined");
  
            // issue warning about using id per data set. Ids should be individual to data elements
            if (typeof(datum.id) != "undefined") {
              console.warn("d3Timeline Warning: Ids per dataset is deprecated in favor of a 'class' key. Ids are now per data element.");
            }
  
            //show background of bottom in black so can see time not in tent in white
            if (backgroundColor) appendBackgroundBar(yAxisMapping, index, g, data, datum);
  
            g.selectAll("svg").data(data).enter()
              .append(function(d, i) {
                  return document.createElementNS(d3.ns.prefix.svg, "display" in d? d.display:display);
              })
              .attr("x", getXPos)
              .attr("y", getStackPosition)
              .attr("width", function (d, i) {
                return (d.ending_time - d.starting_time) * scaleFactor;
              })
              .attr("cy", function(d, i) {
                  return getStackPosition(d, i);
              })
              .attr("cx", getXPos)
              .attr("r", itemHeight / 2)
              .attr("height", itemHeight)
              .style("fill", function(d, i){
                var dColorPropName;
                if (d.color) return d.color;
                if( colorPropertyName ){
                  dColorPropName = d[colorPropertyName];
                  if ( dColorPropName ) {
                    return timelineColor( dColorPropName );
                  } else {
                    return timelineColor( datum[colorPropertyName] );
                  }
                }
                return timelineColor(index);
              })
              .on("mousemove", function (d, i) {
                mousemove(d, index, datum);
              })
              .on("mouseover", function (d, i) {
                mouseover(d, i, datum);
              })
              .on("mouseout", function (d, i) {
                mouseout(d, i, datum);
              })
              .on("click", function (d, i) {
                click(d, index, datum);
              })
              .attr("class", function (d, i) {
                return datum.class ? "timelineSeries_"+datum.class : "timelineSeries_"+index;
              })
              .attr("id", function(d, i) {
                // use deprecated id field
                if (datum.id && !d.id) {
                  return 'timelineItem_'+datum.id;
                }
  
                return d.id ? d.id : "timelineItem_"+index+"_"+i;
              })
            ;
  
            g.selectAll("svg").data(data).enter()
              .append("text")
              .attr("x", getXTextPos)
              .attr("y", getStackTextPosition)
              .text(function(d) {
                return d.label;
              })
            ;
  
            if (rowSeparatorsColor) {
              var lineYAxis = ( itemHeight + itemMargin / 2 + margin.top + (itemHeight + itemMargin) * yAxisMapping[index]);
              gParent.append("svg:line")
                .attr("class", "row-separator")
                .attr("x1", 0 + margin.left)
                .attr("x2", width - margin.right)
                .attr("y1", lineYAxis)
                .attr("y2", lineYAxis)
                .attr("stroke-width", 1)
                .attr("stroke", rowSeparatorsColor);
            }
  
            // add the label
            if (hasLabel) { appendLabel(gParent, yAxisMapping, index, hasLabel, datum); }
  
            if (typeof(datum.icon) !== "undefined") {
              gParent.append("image")
                .attr("class", "timeline-label")
                .attr("transform", "translate("+ 0 +","+ (margin.top + (itemHeight + itemMargin) * yAxisMapping[index])+")")
                .attr("xlink:href", datum.icon)
                .attr("width", margin.left)
                .attr("height", itemHeight);
            }
  
            function getStackPosition(d, i) {
              if (topAndBottom){
                if(index == 0)return getBottom() - itemHeight; //HANDLE
                return getTop();
              }
              if (stacked) {
                return margin.top + (itemHeight + itemMargin) * yAxisMapping[index];
              }
              return margin.top;
            }
            function getStackTextPosition(d, i) {
              if (stacked) {
                return margin.top + (itemHeight + itemMargin) * yAxisMapping[index] + itemHeight * 0.75;
              }
              return margin.top + itemHeight * 0.75;
            }
          });
        });
      }
    }

    var appendTempAxis = function(g, yTempScale) {
      var isMajorTick = (i) => i%2 == 0;

      var yTempAxis = d3.svg.axis()
        .scale(yTempScale)
        .orient("left")
        .tickValues(tempTickFormat.tickValues)
        .tickSize(tempTickFormat.majorTickLength)
        .tickFormat((d, i) => isMajorTick(i) ? d+"\u00B0" : "")

      var axisGroup = g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + margin.left + "," +  0 + ")")
        .call(yTempAxis)
        .call(g => g.select(".domain").remove()) //remove axis line, leaving only ticks, labels
        
      axisGroup.selectAll("g")
        .filter((d, i) => !isMajorTick(i)) //select minor ticks
        .attr("stroke-dasharray", tempTickFormat.minorTickLength+","+tempTickFormat.majorTickLength) //make shorter by strategically setting to truncated dashed line
    }

    var appendTimeAxis = function(g, xAxis, yPosition) {
      if(showAxisHeaderBackground){ appendAxisHeaderBackground(g, 0, 0); }
      if(showAxisNav){ appendTimeAxisNav(g) };

      g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + 0 + "," + yPosition + ")")
        .call(xAxis);
    };

    var appendTimeAxisCalendarYear = function (nav) {
      var calendarLabel = beginning.getFullYear();

      if (beginning.getFullYear() != ending.getFullYear()) {
        calendarLabel = beginning.getFullYear() + "-" + ending.getFullYear()
      }

      nav.append("text")
        .attr("transform", "translate(" + 20 + ", 0)")
        .attr("x", 0)
        .attr("y", 14)
        .attr("class", "calendarYear")
        .text(calendarLabel)
      ;
    };
    
    var appendTimeAxisNav = function (g) {
      var timelineBlocks = 6;
      var leftNavMargin = (margin.left - navMargin);
      var incrementValue = (width - margin.left)/timelineBlocks;
      var rightNavMargin = (width - margin.right - incrementValue + navMargin);

      var nav = g.append('g')
          .attr("class", "axis")
          .attr("transform", "translate(0, 20)")
        ;

      if(showAxisCalendarYear) { appendTimeAxisCalendarYear(nav) };

      nav.append("text")
        .attr("transform", "translate(" + leftNavMargin + ", 0)")
        .attr("x", 0)
        .attr("y", 14)
        .attr("class", "chevron")
        .text("<")
        .on("click", function () {
          return navigateLeft(beginning, chartData);
        })
      ;

      nav.append("text")
        .attr("transform", "translate(" + rightNavMargin + ", 0)")
        .attr("x", 0)
        .attr("y", 14)
        .attr("class", "chevron")
        .text(">")
        .on("click", function () {
          return navigateRight(ending, chartData);
        })
      ;
    };

    function appendAxisHeaderBackground(g, xAxis, yAxis) {
      g.insert("rect")
        .attr("class", "row-green-bar")
        .attr("x", xAxis)
        .attr("width", width)
        .attr("y", yAxis)
        .attr("height", itemHeight)
        .attr("fill", axisBgColor);
    };

    function appendTimeAxisTick(g, xAxis, maxStack) {
      g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + 0 + "," + (margin.top + (itemHeight + itemMargin) * maxStack) + ")")
        .attr(timeAxisTickFormat.stroke, timeAxisTickFormat.spacing)
        .call(xAxis.tickFormat("").tickSize(-(margin.top + (itemHeight + itemMargin) * (maxStack - 1) + 3), 0, 0));
    };

    function appendLabel(gParent, yAxisMapping, index, hasLabel, datum) {
      var fullItemHeight    = itemHeight + itemMargin;
      var rowsDown          = margin.top + (fullItemHeight/2) + fullItemHeight * (yAxisMapping[index] || 1);

      gParent.append("text")
        .attr("class", "timeline-label")
        .attr("transform", "translate(" + labelMargin + "," + rowsDown + ")")
        .text(hasLabel ? labelFunction(datum.label) : datum.id)
        .on("click", function (d, i) { click(d, index, datum); });
    };

    function appendBackgroundBar(yAxisMapping, index, g, data, datum) {
      var y = topAndBottom ? getBottom() - itemHeight: ((itemHeight + itemMargin) * yAxisMapping[index]) + margin.top; //HANDLE
      g.selectAll("svg").data(data).enter()
        .insert("rect")
        .attr("class", "row-green-bar")
        .attr("x", fullLengthBackgrounds ? 0 : margin.left)
        .attr("width", fullLengthBackgrounds ? width : (width - margin.right - margin.left))
        .attr("y", y-0.25) //offset y and height slightly so that background appears a tiny bit above the top and bottom to look like =======
        .attr("height", itemHeight+0.5)
        .attr("fill", backgroundColor instanceof Function ? backgroundColor(datum, index) : backgroundColor)
      ;
    };

    function getTop(){
      return margin.top;
    }

    function getBottom(){
      return height - margin.bottom;
    }

    // SETTINGS
    timeline.margin = function (p) {
      if (!arguments.length) return margin;
      margin = p;
      return timeline;
    };

    timeline.itemHeight = function (h) {
      if (!arguments.length) return itemHeight;
      itemHeight = h;
      return timeline;
    };

    timeline.itemMargin = function (h) {
      if (!arguments.length) return itemMargin;
      itemMargin = h;
      return timeline;
    };

    timeline.navMargin = function (h) {
      if (!arguments.length) return navMargin;
      navMargin = h;
      return timeline;
    };

    timeline.height = function (h) {
      if (!arguments.length) return height;
      height = h;
      return timeline;
    };

    timeline.width = function (w) {
      if (!arguments.length) return width;
      width = w;
      return timeline;
    };

    timeline.display = function (displayType) {
      if (!arguments.length || (DISPLAY_TYPES.indexOf(displayType) == -1)) return display;
      display = displayType;
      return timeline;
    };

    timeline.labelFormat = function(f) {
      if (!arguments.length) return labelFunction;
      labelFunction = f;
      return timeline;
    };

    timeline.tickFormat = function (format) {
      if (!arguments.length) return tickFormat;
      tickFormat = format;
      return timeline;
    };

    timeline.hover = function (hoverFunc) {
      if (!arguments.length) return hover;
      hover = hoverFunc;
      return timeline;
    };

    timeline.mouseover = function (mouseoverFunc) {
      if (!arguments.length) return mouseover;
      mouseover = mouseoverFunc;
      return timeline;
    };

    timeline.mousemove = function (mousemoveFunc) {
      if (!arguments.length) return mosemove;
      mousemove = mousemoveFunc;
      return timeline;
    };

    timeline.mouseout = function (mouseoutFunc) {
      if (!arguments.length) return mouseout;
      mouseout = mouseoutFunc;
      return timeline;
    };

    timeline.click = function (clickFunc) {
      if (!arguments.length) return click;
      click = clickFunc;
      return timeline;
    };

    timeline.scroll = function (scrollFunc) {
      if (!arguments.length) return scroll;
      scroll = scrollFunc;
      return timeline;
    };

    timeline.color = function (color) {
      if (!arguments.length) return timelineColor;
      timelineColor = (() => color);
      return timeline;
    };

    timeline.annotationColor = function (color) {
      if (!arguments.length) return annotationColor;
      annotationColor = (() => color);
      return timeline;
    };

    timeline.backgroundColor = function (color) {
      if (!arguments.length) return backgroundColor;
      backgroundColor = (() => color);
      return timeline;
    };

    timeline.beginning = function (b) {
      if (!arguments.length) return beginning;
      beginning = b;
      return timeline;
    };

    timeline.ending = function (e) {
      if (!arguments.length) return ending;
      ending = e;
      return timeline;
    };

    timeline.labelMargin = function (m) {
      if (!arguments.length) return labelMargin;
      labelMargin = m;
      return timeline;
    };

    timeline.rotateTicks = function (degrees) {
      if (!arguments.length) return rotateTicks;
      rotateTicks = degrees;
      return timeline;
    };

    timeline.stack = function () {
      stacked = !stacked;
      return timeline;
    };

    timeline.topAndBottom = function () {
      topAndBottom = !topAndBottom;
      return timeline;
    }

    timeline.showBorderLine = function () {
      showBorderLine = !showBorderLine;
      return timeline;
    };

    timeline.showBorderFormat = function(borderFormat) {
      if (!arguments.length) return showBorderFormat;
      showBorderFormat = borderFormat;
      return timeline;
    };

    timeline.colorProperty = function(colorProp) {
      if (!arguments.length) return colorPropertyName;
      colorPropertyName = colorProp;
      return timeline;
    };

    timeline.rowSeparators = function (color) {
      if (!arguments.length) return rowSeparatorsColor;
      rowSeparatorsColor = color;
      return timeline;

    };

    timeline.showTempAxis = function () {
      showTempAxis = !showTempAxis;
      return timeline;
    };

    timeline.showTimeAxis = function () {
      showTimeAxis = !showTimeAxis;
      return timeline;
    };

    timeline.showAxisTop = function () {
      showAxisTop = !showAxisTop;
      return timeline;
    };

    timeline.showAxisCalendarYear = function () {
      showAxisCalendarYear = !showAxisCalendarYear;
      return timeline;
    };

    timeline.showTimeAxisTick = function () {
      timeAxisTick = !timeAxisTick;
      return timeline;
    };

    timeline.fullLengthBackgrounds = function () {
      fullLengthBackgrounds = !fullLengthBackgrounds;
      return timeline;
    };

    timeline.showTimeAxisTickFormat = function(format) {
      if (!arguments.length) return timeAxisTickFormat;
      timeAxisTickFormat = format;
      return timeline;
    };

    timeline.showAxisHeaderBackground = function(bgColor) {
      showAxisHeaderBackground = !showAxisHeaderBackground;
      if(bgColor) { (axisBgColor = bgColor) };
      return timeline;
    };

    timeline.navigate = function (navigateBackwards, navigateForwards) {
      if (!arguments.length) return [navigateLeft, navigateRight];
      navigateLeft = navigateBackwards;
      navigateRight = navigateForwards;
      showAxisNav = !showAxisNav;
      return timeline;
    };

    return timeline;
  };
})();

const height = 200;
const margins = {left: 40, right: 40, top: 10, bottom: 10};

function makeTimeline(data) {
  data.forEach((yearData) => {
    numDays = yearData.midnights.length - 1;
    width = numDays * (height - margins.top - margins.bottom) + margins.left + margins.right;

    var chart = d3.timeline()
      .margin(margins)
      .topAndBottom()
      .itemHeight(2)
      .color("white")
      .backgroundColor("black")
      .showBorderLine()
      .showTempAxis()
      .beginning(yearData.midnights[0]) //start at first midnight...
      .ending(yearData.midnights[yearData.midnights.length-1]); //...and continue up to last midnight
    var svg = d3.select("#timeline"+yearData.year).append("svg")
      .attr("width", width)
      .attr("height",height)
      .style("font", "10px times")
      .datum([yearData]).call(chart);
  });
}

d3.json("/tentchecks.json", function(data) {
  makeTimeline(data);
});