import React from "react";
import { Icon } from "@/components/ui/icon";
import type { MilestoneItem } from "../types";

interface MilestonesTimelineProps {
  milestones: MilestoneItem[];
}

export function MilestonesTimeline({ milestones }: MilestonesTimelineProps) {
  const getCategoryColor = (category: MilestoneItem["category"]) => {
    switch (category) {
      case "Tasting":
        return "bg-gold";
      case "Floristry":
        return "bg-wine";
      case "Cutoff":
        return "bg-success";
      default:
        return "bg-secondary";
    }
  };

  const getBadgeStyle = (category: MilestoneItem["category"]) => {
    switch (category) {
      case "Tasting":
        return "bg-secondary-container text-on-secondary-container";
      case "Floristry":
        return "bg-primary-container text-on-primary";
      case "Cutoff":
        return "bg-success-surface text-success";
      default:
        return "bg-surface-container text-paper-ink";
    }
  };

  return (
    <section className="bg-paper rounded-[24px] p-space-lg lg:p-margin shadow-sm mb-space-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-lg pb-space-sm border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="event_note" className="text-wine text-xl" />
            <h3 className="font-headline-sm text-headline-sm text-night">
              Upcoming Milestones
            </h3>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Key deadlines occurring in the next 14 days across all active
            celebrations.
          </p>
        </div>

        <button
          type="button"
          className="px-space-md py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-paper-ink font-label-md text-label-md self-start sm:self-center transition-all flex items-center gap-1.5 min-h-[44px]"
        >
          <Icon name="calendar_view_week" className="text-lg" />
          <span>View Master Calendar</span>
        </button>
      </div>

      {/* Timeline Items Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {milestones.map((item) => (
          <div
            key={item.id}
            className="bg-surface-container-low rounded-2xl p-space-md relative overflow-hidden flex flex-col justify-between group hover:bg-surface-container transition-all"
          >
            {/* Color Stripe */}
            <div
              className={`absolute top-0 left-0 w-1.5 h-full ${getCategoryColor(
                item.category
              )}`}
            />

            <div>
              <div className="flex items-center justify-between text-label-sm font-label-sm mb-1.5 pl-2">
                <span className="text-secondary font-semibold">
                  In {item.daysAway} Days • {item.dueDate}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getBadgeStyle(
                    item.category
                  )}`}
                >
                  {item.category}
                </span>
              </div>
              <h4 className="font-title-md text-title-md text-night pl-2">
                {item.title}
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 pl-2">
                {item.description}
              </p>
            </div>

            <div className="mt-space-md pt-space-xs pl-2 flex items-center justify-between text-label-sm font-label-sm text-paper-ink border-t border-surface-container">
              <span className="text-wine font-medium">{item.eventTitle}</span>
              <Icon
                name="arrow_outward"
                className="text-lg text-mist group-hover:text-primary transition-colors"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
