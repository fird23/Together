package app.together.couple;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Мост между сайтом и Android:
 *  - isPushAvailable: подключён ли Firebase в этой сборке (без google-services.json регистрировать push нельзя);
 *  - setWidgetData: сайт передаёт сводку для виджета;
 *  - pinWidget: предложить добавить виджет на главный экран.
 */
@CapacitorPlugin(name = "TogetherNative")
public class TogetherNativePlugin extends Plugin {
    public static final String PREFS = "together_widget";
    public static final String KEY_SUMMARY = "summary";
    public static final String CHANNEL_ID = "together_default";

    @Override
    public void load() {
        createChannel(getContext());
    }

    /** Канал уведомлений по умолчанию (Android 8+). */
    static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Together", NotificationManager.IMPORTANCE_DEFAULT);
                channel.setDescription("Напоминания и сообщения от партнёра");
                manager.createNotificationChannel(channel);
            }
        }
    }

    @PluginMethod
    public void isPushAvailable(PluginCall call) {
        Context context = getContext();
        // google-services.json превращается в строковый ресурс google_app_id; без него Firebase не подключён
        int id = context.getResources().getIdentifier("google_app_id", "string", context.getPackageName());
        JSObject result = new JSObject();
        result.put("available", id != 0);
        call.resolve(result);
    }

    @PluginMethod
    public void setWidgetData(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("json is required");
            return;
        }
        Context context = getContext();
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_SUMMARY, json).apply();
        TogetherWidgetProvider.updateAll(context);
        call.resolve();
    }

    @PluginMethod
    public void pinWidget(PluginCall call) {
        Context context = getContext();
        boolean requested = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            if (manager.isRequestPinAppWidgetSupported()) {
                requested = manager.requestPinAppWidget(new ComponentName(context, TogetherWidgetProvider.class), null, null);
            }
        }
        JSObject result = new JSObject();
        result.put("requested", requested);
        call.resolve(result);
    }

    // ---- Смена иконки приложения: у каждой иконки свой activity-alias в манифесте, включён всегда ровно один ----
    private static final String[] ICONS = {"classic", "night", "sunset", "mint", "rose", "graphite"};

    private ComponentName iconComponent(Context context, String icon) {
        String name = Character.toUpperCase(icon.charAt(0)) + icon.substring(1);
        return new ComponentName(context.getPackageName(), "app.together.couple.Icon" + name);
    }

    @PluginMethod
    public void getAppIcon(PluginCall call) {
        Context context = getContext();
        PackageManager pm = context.getPackageManager();
        String current = "classic";
        for (String icon : ICONS) {
            int state = pm.getComponentEnabledSetting(iconComponent(context, icon));
            if (state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                    || (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && icon.equals("classic"))) {
                current = icon;
                if (state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) break;
            }
        }
        JSObject result = new JSObject();
        result.put("icon", current);
        call.resolve(result);
    }

    @PluginMethod
    public void setAppIcon(PluginCall call) {
        String chosen = call.getString("icon");
        boolean known = false;
        for (String icon : ICONS) if (icon.equals(chosen)) known = true;
        if (!known) {
            call.reject("Неизвестная иконка");
            return;
        }
        Context context = getContext();
        PackageManager pm = context.getPackageManager();
        // Сначала включаем выбранную, потом выключаем остальные: так значок на экране приложений не исчезает.
        pm.setComponentEnabledSetting(iconComponent(context, chosen), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
        for (String icon : ICONS) {
            if (!icon.equals(chosen)) {
                pm.setComponentEnabledSetting(iconComponent(context, icon), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            }
        }
        call.resolve();
    }
}
