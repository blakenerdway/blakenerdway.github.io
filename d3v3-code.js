class PageCount{
    constructor(){
        this._currPage = 1;
    }


    pageBackward(){
        this._currPage--;
        if (this._currPage === 1){
            $('#page-backward').attr("disabled", true);
        }

        $('#page-forward').attr("disabled", false);
    };

    pageForward(){
        this._currPage++;
        if (this._currPage === 3){
            $('#page-forward').attr("disabled", true);
        }
        $('#page-backward').attr("disabled", false);
    };
}

pageCount = new PageCount();

function onLoad() {
    d3.csv("average_medicare_2017.csv", function (err, data) {
        let stateColumn = "Provider State";
        let MAP_VALUE = "Average_Percent_Covered_State";

        let width = 1000,
            height = 500;

        let valueById = d3.map();
        let colorScale = d3.scale.linear().range(["red", "green"]);
        let path = d3.geo.path();

        let svg = d3.select("#map-svg").select("svg")
            .attr("width", width)
            .attr("height", height);


        d3.tsv("https://s3-us-west-2.amazonaws.com/vida-public/geo/us-state-names.tsv", function (error, names) {

            codeIDMap = {};
            idNameMap = {};


            for (let i = 0; i < names.length; i++) {
                codeIDMap[names[i].code] = names[i].id;
                idNameMap[names[i].id] = names[i].name;
            }

            data.forEach(function (d) {
                let id = codeIDMap[d[stateColumn]];
                valueById.set(id, d[MAP_VALUE]);
            });

            colorScale.domain(
            [
                d3.min(data, function (d) {
                    return +d[MAP_VALUE];
                }),
                d3.max(data, function (d) {
                    return d[MAP_VALUE];
                })
            ]);


            d3.json("https://s3-us-west-2.amazonaws.com/vida-public/geo/us.json", function (error, us) {
                var topoFeatures = topojson.feature(us, us.objects.states).features;
                svg.append("g")
                    .attr("class", "states-choropleth")
                    .selectAll("path")
                    .data(topojson.feature(us, us.objects.states).features)
                    .enter().append("path")
                    .style("fill", function (d) {
                        if (valueById.get(d.id)) {
                            return colorScale(valueById.get(d.id));
                        }
                        else {
                            return "";
                        }
                    })
                    .attr("d", path)
                    .on("mousemove", function (d) {
                        let html = "";

                        html += "<div class=\"tooltip_kv\">";
                        html += "<span class=\"tooltip_key\">";
                        html += idNameMap[d.id];
                        html += "</span>";
                        html += "<span class=\"tooltip_value\">";
                        html += (valueById.get(d.id) ? valueById.get(d.id) : "");
                        html += "</span>";
                        html += "</div>";

                        const tooltipContainer = $("#tooltip-container");
                        tooltipContainer.html(html);
                        $(this).attr("fill-opacity", "0.8");
                        tooltipContainer.show();

                        let map_width = $('.states-choropleth')[0].getBoundingClientRect().width;

                        if (d3.event.layerX < map_width / 2) {
                            d3.select("#tooltip-container")
                                .style("top", (d3.event.layerY + 15) + "px")
                                .style("left", (d3.event.layerX + 15) + "px");
                        } else {
                            let tooltip_width = tooltipContainer.width();
                            d3.select("#tooltip-container")
                                .style("top", (d3.event.layerY + 15) + "px")
                                .style("left", (d3.event.layerX - tooltip_width - 30) + "px");
                        }
                    })
                    .on("mouseout", function () {
                        $(this).attr("fill-opacity", "1.0");
                        $("#tooltip-container").hide();
                    });

                console.log(typeof(us));
                console.log(us.objects.states);
                console.log(us);

                svg.append("g").append("path")
                    .datum(topojson.mesh(us, us.objects.states, function (a, b) {
                        return a !== b;
                    }))
                    .attr("class", "states")
                    .attr("d", path);
            });
        });
    });
}


function moveForward(){
    pageCount.pageForward();
}

function moveBackward(){
    pageCount.pageBackward();
}

