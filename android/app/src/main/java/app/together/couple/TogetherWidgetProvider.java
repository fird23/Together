package app.together.couple;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Виджет «Мы вместе»: сколько дней вместе (считается на телефоне, поэтому меняется каждый день без открытия приложения),
 * сколько привычек осталось на сегодня и ближайшее событие. Привычки и событие обновляются, когда открыто приложение.
 */
public class TogetherWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, build(context));
        }
    }

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, TogetherWidgetProvider.class));
        for (int id : ids) {
            manager.updateAppWidget(id, build(context));
        }
    }

    private static RemoteViews build(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_together);

        JSONObject summary = null;
        try {
            String raw = context.getSharedPreferences(TogetherNativePlugin.PREFS, Context.MODE_PRIVATE)
                    .getString(TogetherNativePlugin.KEY_SUMMARY, null);
            if (raw != null) summary = new JSONObject(raw);
        } catch (Exception ignored) {
        }

        String today = isoOffset(0);
        String tomorrow = isoOffset(1);

        if (summary == null || summary.optString("start").isEmpty()) {
            views.setTextViewText(R.id.widget_names, "Together");
            views.setTextViewText(R.id.widget_days, "♥");
            views.setTextViewText(R.id.widget_label, "Откройте приложение, чтобы настроить виджет");
            views.setViewVisibility(R.id.widget_habits, View.GONE);
            views.setViewVisibility(R.id.widget_event, View.GONE);
        } else {
            long days = daysSince(summary.optString("start"));
            views.setTextViewText(R.id.widget_names, summary.optString("names", "Together"));
            views.setTextViewText(R.id.widget_days, String.valueOf(days));
            views.setTextViewText(R.id.widget_label, plural(days, "день", "дня", "дней") + " вместе");

            // Привычки: показываем, только если сводка за сегодня
            JSONObject habits = summary.optJSONObject("habits");
            if (habits != null && today.equals(habits.optString("date"))) {
                int left = habits.optInt("left", 0);
                int total = habits.optInt("total", 0);
                String text;
                if (total == 0) text = "Сегодня без привычек";
                else if (left == 0) text = "Все привычки выполнены ✓";
                else text = "Осталось привычек: " + left;
                views.setTextViewText(R.id.widget_habits, text);
                views.setViewVisibility(R.id.widget_habits, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_habits, View.GONE);
            }

            // Ближайшее событие: сегодня, завтра или дата
            JSONObject event = summary.optJSONObject("event");
            String eventDate = event == null ? "" : event.optString("date");
            if (event != null && eventDate.compareTo(today) >= 0) {
                String when = eventDate.equals(today) ? "Сегодня" : eventDate.equals(tomorrow) ? "Завтра" : shortDate(eventDate);
                views.setTextViewText(R.id.widget_event, when + ": " + event.optString("title"));
                views.setViewVisibility(R.id.widget_event, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_event, View.GONE);
            }
        }

        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pending);
        return views;
    }

    /** Дней с даты начала отношений (YYYY-MM-DD) до сегодняшнего дня по местному времени. */
    private static long daysSince(String iso) {
        try {
            String[] p = iso.split("-");
            Calendar start = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
            start.clear();
            start.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]));
            Calendar now = Calendar.getInstance();
            Calendar today = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
            today.clear();
            today.set(now.get(Calendar.YEAR), now.get(Calendar.MONTH), now.get(Calendar.DAY_OF_MONTH));
            return Math.max(0, (today.getTimeInMillis() - start.getTimeInMillis()) / 86400000L);
        } catch (Exception e) {
            return 0;
        }
    }

    /** Местная дата YYYY-MM-DD со сдвигом на offset дней. */
    private static String isoOffset(int offset) {
        Calendar c = Calendar.getInstance();
        c.add(Calendar.DAY_OF_MONTH, offset);
        return String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    private static String shortDate(String iso) {
        String[] p = iso.split("-");
        return p.length == 3 ? p[2] + "." + p[1] : iso;
    }

    private static String plural(long n, String one, String few, String many) {
        long mod10 = n % 10, mod100 = n % 100;
        if (mod10 == 1 && mod100 != 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
        return many;
    }
}
