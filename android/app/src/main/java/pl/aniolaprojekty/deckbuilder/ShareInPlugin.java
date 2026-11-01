package pl.aniolaprojekty.deckbuilder;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Receives text/files shared to the app (e.g. a card list from ManaBox) and hands them to the web layer. */
@CapacitorPlugin(name = "ShareIn")
public class ShareInPlugin extends Plugin {
    private static String pending = null;
    private static ShareInPlugin instance = null;

    @Override
    public void load() {
        instance = this;
    }

    static void deliver(String text) {
        if (instance != null && instance.hasListeners("shared")) {
            JSObject o = new JSObject();
            o.put("text", text);
            instance.notifyListeners("shared", o);
        } else {
            pending = text; // picked up by getShared() when the page is ready
        }
    }

    @PluginMethod
    public void getShared(PluginCall call) {
        JSObject o = new JSObject();
        o.put("text", pending);
        pending = null;
        call.resolve(o);
    }
}
