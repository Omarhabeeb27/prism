# Updating Prism on Frappe Cloud

Frappe Cloud builds apps from GitHub, so a change reaches your site in two stages: the **bench** fetches and builds the new code, then the **site** moves onto that build and migrates. Button names can change as Frappe updates the dashboard.

## 1. Before you start

Pick a quiet time. Your site can be unavailable for a few minutes while it migrates.

On your site, open **Backups** and take a backup.

## 2. Fetch the new code

1. Open **Benches** in the left menu, then open the bench your site runs on.
2. Open the **Apps** tab.
3. On the **Prism** row, open the **...** menu and choose **Fetch Latest Updates** (a refresh button at the top does the same for all apps).
4. Do the same for any other app you've changed, such as **Falcon HR**.

## 3. Deploy

1. Click **Update Available** or **Deploy** at the top of the bench page.
2. Select **Prism** and any other apps you fetched. Check that the commit is the one you expect.
3. If other apps such as Frappe or ERPNext are listed and you don't want them changed, untick them.
4. Start the deploy and wait for it to finish. You can follow it on the bench's **Deploys** tab.

## 4. Update the site

1. When the deploy finishes, choose to update your site. Either accept the prompt, or open the site and use **Updates**.
2. Keep the backup option on.
3. Wait for the update to finish. You can follow it under the site's **Activity** or **Updates** tab.

If a migration fails, Frappe Cloud normally restores the site from the backup it took.

## 5. Check it worked

1. Open the site's **Apps** tab. The Prism commit should match the latest one on GitHub.
2. Open your site and do a hard refresh with **Ctrl+Shift+R**.
3. Open the **Prism** tile. You should see the new Theme Studio and a sidebar with icons.
4. Open **Prism > Settings**. It should show version 0.3.0.

## 6. Turn it on

An update doesn't change whether Prism is on. If your site still looks standard:

1. Open **Prism > Theme Studio**.
2. Choose a theme and click **Use this theme**.

This changes what everyone on the site sees, and they get it the next time a page loads. The toggle turns it on or off for the person using it.

## If something looks wrong

| What you see | What to do |
|---|---|
| The old Theme Studio or old styling | Hard refresh with Ctrl+Shift+R. If it remains, use **Prism > Settings > Refresh everyone's theme** |
| A user still sees the old theme | Same as above, then have them reload the page |
| The theme is wrong for one person | Check their row on **Prism > User Themes**, and their own toggle |
| You need to go back at once | Turn the switch off on **Prism > Settings**. This returns everyone to the standard look without removing anything |
| You need to go back to the old version | Restore the backup from step 1. Contact Frappe Cloud support if you need the bench moved back too |
