
function refresh_countdown_dialog_box(seconds) {
    $("#refresh-page-dialog").dialog({
        modal: true,
        title: gettext("Installation finished."),
        width: "auto",
        resizable: false
    });
    var millisec = seconds * 1000;
    var decrement = 1000;
    var dialog_text = "";
    dialog_text = sprintf(gettext("Installation finished! Refreshing the page in %(sec)s seconds"), {sec: seconds});
    $("#dialog-content").html(dialog_text);
    setInterval(function() {
        if (millisec > 0) {
            var seconds = Math.floor(millisec / 1000);
            dialog_text = sprintf(gettext("Installation finished! Refreshing the page in %(sec)s seconds"), {sec: seconds});
            $("#dialog-content").html(dialog_text);
            millisec -= decrement;
        } else {
            window.location.reload();
        }
    }, decrement);
}


function version_callback(data) {
    // Check to see if the remote software matches the local software version.
    //   If not, alert the user!
    var current_version = "{{ software_version }}";
    var remote_version = data.version;
    if (! remote_version ) {
        show_message("error", gettext("Remote version information unavailable."));
    } else if (current_version != remote_version) {
        $("#update_info").show();  // show the related div
        $("#internet_update").show();

        version_info = data["version_info"];

        //alert("update available! " + current_version + " < " + remote_version);
        $("#remote_version").text(remote_version);
        $("#remote_release_date").text(version_info[remote_version].release_date);

        // Update feature list
        //$("#new_features").text("");
        for (version in version_info) {  // loop through all features of all uninstalled versions
            if (! version_info[version]["new_features"]) {
                $("#new_features").append(sprintf("<li>(%s)</li>", gettext("None")));
            } else {
                for (fi in version_info[version]["new_features"]) {
                    $("#new_features").append("<li>" + version_info[version]["new_features"][fi] + "</li>");
                }
            }
            if (! version_info[version]["bugs_fixed"]) {
                $("#bugs_fixed").append(gettext("<li>(%s)</li>", gettext("None")));
            } else {
                for (fi in version_info[version]["bugs_fixed"]) {
                    $("#bugs_fixed").append("<li>" + version_info[version]["bugs_fixed"][fi] + "</li>");
                }
            }
        }
    }
}

function download_urls_callback(data) {
    locale = "en";//{{ current_locale }}"
    $("#software_available").append(sprintf("<option value='%s'>%s (%s MB)</option>", data[locale].url, locale, data[locale].size));
}

$(function() {
    // hide the installation complete dialog box
    $("#refresh-page-dialog").hide();

    setTimeout(function() {
        get_server_status({path: GET_SERVER_INFO_URL}, ["online"], function(status){
            // We assume the distributed server is offline.
            //   if it's online, then we show all tools only usable when online.
            //
            // Best to assume offline, as online check returns much faster than offline check.
            if(false && (!status || !status["online"])){
                show_message("error", gettext("Your installation is offline, and therefore cannot access updates."));
            } else {
                $("#software_available").removeAttr("disabled");
                $("#download-update-kalite").removeAttr("disabled");
                $("#upload-update-kalite").removeAttr("disabled");
                clear_messages("id_offline_message");
            }
        });

    }, 200);

    $("#download-update-kalite").click(function() {

        // we have to define the modal dialog buttons
        // here rather than inline because having
        // gettext("Yes") in a definition of a dictionary
        // is a syntax error.
        var button_behaviors = {};
        button_behaviors[gettext("Yes")] = function() {
            // Start the download and updating process
            // Update the UI to reflect that we're waiting to start
            doRequest(
                UPDATE_SOFTWARE_URL,
                { mechanism: $("#download-update-kalite").attr("mechanism") }
            ).success(function() {
                updatesStart_callback("update");
            }).fail(function(response) {
                show_message("error", sprintf(gettext("Error starting update process %(status)s: %(responseText)s"), response));
            });
            // remove the dialog box
            $(this).remove();
        };
        button_behaviors[gettext("No")] = function() {
            $(this).remove();
        };

        $("<div></div>").appendTo("body")
        .html("<div>" + gettext("Are you sure you want to update your installation of KA Lite? This process is irreversible!") + "</div>")
        .dialog({
            modal: true,
            title: gettext("Confirm update"),
            width: "auto",
            resizable: false,
            buttons: button_behaviors
        });
        //updatesStart("update", 1000, software_callbacks)
    });
    // onload
});


function update_server_status() {
    with_online_status("server", function(server_is_online) {
        // We assume the distributed server is offline; if it's online, then we enable buttons that only work with internet.
        // Best to assume offline, as online check returns much faster than offline check.
        if(!server_is_online){
            clear_messages();
            show_message("error", gettext("The server does not have internet access; software cannot be updated at this time."));
        }
    });
}

 $(function() {
    doRequest(CENTRAL_KALITE_VERSION_URL, null, { dataType: "jsonp" })
        .success(function(data) {
            version_callback(data);
         })
         .fail( update_server_status );

    doRequest(CENTRAL_KALITE_DOWNLOAD_URL, null, { dataType: "jsonp" })
        .success(function(data) {
            download_urls_callback(data);
            updatesStart("update", 1000, software_callbacks);
        })
        .fail( update_server_status );
 });
